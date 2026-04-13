# 下课铃 H5 部署说明

## 目录建议
- `/var/www/xia-ke-ling/web`
  说明：放前端 `index.html` 和素材目录
- `/var/www/xia-ke-ling/api`
  说明：放 `api/` 服务代码

## 1. 服务器初始化
```bash
sudo apt update
sudo apt install -y nginx mysql-server
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. 初始化数据库
```bash
mysql -u root -p < /var/www/xia-ke-ling/database/schema.sql
```

建议额外创建专用数据库账号：
```sql
CREATE USER 'app_user'@'127.0.0.1' IDENTIFIED BY 'change_me';
GRANT SELECT, INSERT, UPDATE ON xia_ke_ling.* TO 'app_user'@'127.0.0.1';
FLUSH PRIVILEGES;
```

## 3. 启动 API
```bash
cd /var/www/xia-ke-ling/api
cp .env.example .env
npm install
pm2 start /var/www/xia-ke-ling/ecosystem.config.cjs
pm2 save
pm2 startup
```

## 4. 配置前端
- 将前端 HTML 文件改名为 `index.html`
- 将素材目录一起放到 `/var/www/xia-ke-ling/web`
- 确保前端中的接口地址为：
  - `/api/results`
  - `/api/ranking`

## 5. 配置 Nginx
```bash
sudo cp /var/www/xia-ke-ling/deploy/nginx.xia-ke-ling.conf /etc/nginx/sites-available/xia-ke-ling.conf
sudo ln -s /etc/nginx/sites-available/xia-ke-ling.conf /etc/nginx/sites-enabled/xia-ke-ling.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 6. 开启 HTTPS
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## 7. 验证接口
```bash
curl https://your-domain.com/api/health
curl https://your-domain.com/api/ranking
```

## 8. 备份建议
- 每日备份 MySQL：
```bash
mysqldump -u root -p xia_ke_ling > /var/backups/xia_ke_ling_$(date +%F).sql
```
- 可将该命令写入 `crontab`
