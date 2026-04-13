import express from "express";
import crypto from "node:crypto";
import { Redis } from "@upstash/redis";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { ACADEMIES, ALLOWED_ACADEMIES } from "./constants.js";

const app = express();
const wechatCache = {
  accessToken: { value: "", expiresAt: 0 },
  jsapiTicket: { value: "", expiresAt: 0 }
};
const redis = config.upstash.url && config.upstash.token
  ? new Redis({ url: config.upstash.url, token: config.upstash.token })
  : null;
const REDIS_KEYS = {
  total: "ranking:total",
  academies: "ranking:academies",
  updatedAt: "ranking:updated_at",
  clientPrefix: "ranking:client",
  resultPrefix: "ranking:result"
};

if (config.trustProxy) {
  app.set("trust proxy", 1);
}

app.use(helmet({
  crossOriginResourcePolicy: false
}));
app.use(express.json({ limit: "100kb" }));
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false
}));

function isNonEmptyString(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

function validateSubmitPayload(body) {
  const errors = [];

  if (!isNonEmptyString(body.resultId, 64)) {
    errors.push("resultId is required");
  }
  if (!isNonEmptyString(body.campusRole, 128)) {
    errors.push("campusRole is required");
  }
  if (!isNonEmptyString(body.clientId, 64)) {
    errors.push("clientId is required");
  }
  if (!ALLOWED_ACADEMIES.includes(body.academyName)) {
    errors.push("academyName is invalid");
  }
  if (body.sectName && typeof body.sectName !== "string") {
    errors.push("sectName is invalid");
  }
  if (!Number.isFinite(body.timestamp) || body.timestamp <= 0) {
    errors.push("timestamp is invalid");
  }

  return errors;
}

async function getRankingRows() {
  if (!redis) {
    throw new Error("upstash redis is not configured");
  }
  const [totalRaw, statsMap, updatedAt] = await Promise.all([
    redis.get(REDIS_KEYS.total),
    redis.hgetall(REDIS_KEYS.academies),
    redis.get(REDIS_KEYS.updatedAt)
  ]);
  const total = Number(totalRaw || 0);
  return {
    total,
    updatedAt,
    items: ACADEMIES.map((academy) => {
      const count = Number(statsMap?.[academy.name] || 0);
      return {
        name: academy.name,
        sect: academy.sect,
        count,
        ratio: total > 0 ? Number((count / total).toFixed(6)) : 0
      };
    }).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"))
  };
}

function isWechatConfigured() {
  return Boolean(config.wechat.appId && config.wechat.appSecret);
}

function getWechatExpiryTime(expiresInSeconds) {
  const bufferMs = config.wechat.tokenRefreshBufferSeconds * 1000;
  return Date.now() + (Number(expiresInSeconds || 0) * 1000) - bufferMs;
}

async function fetchWechatJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`wechat request failed: ${response.status}`);
  }
  const data = await response.json();
  if (Number(data.errcode || 0) !== 0) {
    throw new Error(data.errmsg || "wechat api error");
  }
  return data;
}

async function getWechatAccessToken() {
  if (wechatCache.accessToken.value && wechatCache.accessToken.expiresAt > Date.now()) {
    return wechatCache.accessToken.value;
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(config.wechat.appId)}&secret=${encodeURIComponent(config.wechat.appSecret)}`;
  const data = await fetchWechatJson(url);
  wechatCache.accessToken = {
    value: data.access_token,
    expiresAt: getWechatExpiryTime(data.expires_in)
  };
  return wechatCache.accessToken.value;
}

async function getWechatJsapiTicket() {
  if (wechatCache.jsapiTicket.value && wechatCache.jsapiTicket.expiresAt > Date.now()) {
    return wechatCache.jsapiTicket.value;
  }

  const accessToken = await getWechatAccessToken();
  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${encodeURIComponent(accessToken)}&type=jsapi`;
  const data = await fetchWechatJson(url);
  wechatCache.jsapiTicket = {
    value: data.ticket,
    expiresAt: getWechatExpiryTime(data.expires_in)
  };
  return wechatCache.jsapiTicket.value;
}

function createWechatSignature(url, jsapiTicket) {
  const nonceStr = crypto.randomBytes(8).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `jsapi_ticket=${jsapiTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  const signature = crypto.createHash("sha1").update(payload).digest("hex");
  return { nonceStr, timestamp, signature };
}

function isRedisConfigured() {
  return Boolean(redis);
}

function getClientCooldownKey(clientId) {
  return `${REDIS_KEYS.clientPrefix}:${clientId}`;
}

function getResultDedupeKey(resultId) {
  return `${REDIS_KEYS.resultPrefix}:${resultId}`;
}

app.get("/api/health", async (req, res) => {
  try {
    if (!redis) {
      throw new Error("redis unavailable");
    }
    await redis.ping();
    res.json({
      ok: true,
      source: "remote",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: "redis unavailable"
    });
  }
});

app.get("/api/ranking", async (req, res, next) => {
  try {
    const ranking = await getRankingRows();
    res.json({
      total: ranking.total,
      updatedAt: ranking.updatedAt ? new Date(ranking.updatedAt).toISOString() : new Date().toISOString(),
      source: "remote",
      items: ranking.items
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/share/wechat-sign", async (req, res, next) => {
  if (!isWechatConfigured()) {
    return res.status(503).json({
      message: "wechat share is not configured"
    });
  }

  const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
  if (!rawUrl) {
    return res.status(400).json({
      message: "url is required"
    });
  }

  try {
    const parsedUrl = new URL(rawUrl);
    parsedUrl.hash = "";
    const normalizedUrl = parsedUrl.toString();
    const jsapiTicket = await getWechatJsapiTicket();
    const signData = createWechatSignature(normalizedUrl, jsapiTicket);

    res.json({
      appId: config.wechat.appId,
      timestamp: signData.timestamp,
      nonceStr: signData.nonceStr,
      signature: signData.signature,
      url: normalizedUrl,
      shareLink: config.share.publicBaseUrl || `${parsedUrl.origin}${parsedUrl.pathname}`,
      imgUrl: config.share.defaultShareImageUrl || `${parsedUrl.origin}/static/share-cover.png`
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/results", async (req, res, next) => {
  const errors = validateSubmitPayload(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      message: "invalid payload",
      errors
    });
  }

  const { resultId, academyName, campusRole, sectName, clientId, timestamp } = req.body;

  try {
    if (!isRedisConfigured()) {
      return res.status(503).json({
        message: "ranking storage is not configured"
      });
    }

    const normalizedResultId = resultId.trim();
    const normalizedAcademyName = academyName.trim();
    const normalizedCampusRole = campusRole.trim();
    const normalizedSectName = sectName ? sectName.trim() : "";
    const normalizedClientId = clientId.trim();
    const resultDedupeKey = getResultDedupeKey(normalizedResultId);
    const clientCooldownKey = getClientCooldownKey(normalizedClientId);

    const [existingResult, recentClientSubmit] = await Promise.all([
      redis.get(resultDedupeKey),
      redis.get(clientCooldownKey)
    ]);

    if (existingResult) {
      return res.status(200).json({
        ok: true,
        duplicated: true
      });
    }

    if (recentClientSubmit) {
      return res.status(429).json({
        message: "too many submissions from this client"
      });
    }

    const nowIso = new Date().toISOString();
    await redis.multi()
      .set(resultDedupeKey, JSON.stringify({
        academyName: normalizedAcademyName,
        campusRole: normalizedCampusRole,
        sectName: normalizedSectName,
        clientId: normalizedClientId,
        timestamp
      }), { ex: config.dedupeTtlSeconds })
      .set(clientCooldownKey, nowIso, { ex: config.clientSubmitCooldownSeconds })
      .incr(REDIS_KEYS.total)
      .hincrby(REDIS_KEYS.academies, normalizedAcademyName, 1)
      .set(REDIS_KEYS.updatedAt, nowIso)
      .exec();

    res.status(201).json({
      ok: true,
      duplicated: false
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: "internal server error"
  });
});

if (!process.env.VERCEL) {
  app.listen(config.port, () => {
    console.log(`xia-ke-ling api listening on ${config.port}`);
  });
}

export default app;
