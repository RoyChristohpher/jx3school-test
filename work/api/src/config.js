import dotenv from "dotenv";

dotenv.config();

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const config = {
  port: toInt(process.env.PORT, 3000),
  trustProxy: process.env.TRUST_PROXY === "1",
  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: toInt(process.env.RATE_LIMIT_MAX, 30)
  },
  clientSubmitCooldownSeconds: toInt(process.env.CLIENT_SUBMIT_COOLDOWN_SECONDS, 30),
  dedupeTtlSeconds: toInt(process.env.RESULT_DEDUPE_TTL_SECONDS, 604800),
  upstash: {
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || ""
  },
  wechat: {
    appId: process.env.WECHAT_APP_ID || "",
    appSecret: process.env.WECHAT_APP_SECRET || "",
    tokenRefreshBufferSeconds: toInt(process.env.WECHAT_TOKEN_REFRESH_BUFFER_SECONDS, 300)
  },
  share: {
    publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
    defaultShareImageUrl: process.env.DEFAULT_SHARE_IMAGE_URL || ""
  }
};
