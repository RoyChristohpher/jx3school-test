# Vercel + Upstash 部署说明

## 当前推荐方案
- 前端页面部署到 Vercel
- 排行榜接口部署到 Vercel Functions
- 排行榜数据存储到 Upstash Redis
- 不需要购买云服务器

## 当前目录可直接部署
把 `work` 目录直接作为 Vercel 项目根目录即可，当前已经包含：
- `index.html`
- `vercel.json`
- `package.json`
- `api/index.js`
- `static/share-cover.png`

## 必填环境变量
在 Vercel Project Settings -> Environment Variables 中至少填写：

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RESULT_DEDUPE_TTL_SECONDS=604800
CLIENT_SUBMIT_COOLDOWN_SECONDS=30

WECHAT_APP_ID=
WECHAT_APP_SECRET=
PUBLIC_BASE_URL=https://your-domain.com/
DEFAULT_SHARE_IMAGE_URL=https://your-domain.com/static/share-cover.png
```

## 部署后可用接口
- `/api/health`
- `/api/ranking`
- `/api/results`
- `/api/share/wechat-sign`

## 排行榜写入逻辑
- 用户完成测试后提交结果
- 后端会：
  - 总人数加一
  - 对应学院计数加一
  - 用 `resultId` 做去重
  - 用 `clientId` 做短时间频控

## Redis Key
- `ranking:total`
- `ranking:academies`
- `ranking:updated_at`
- `ranking:client:<clientId>`
- `ranking:result:<resultId>`

## 部署后验证
访问：

```text
/
/api/health
/api/ranking
```

如果 `/api/health` 返回 `ok: true`，说明 Redis 已经连通。
