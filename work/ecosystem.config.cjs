module.exports = {
  apps: [
    {
      name: "xia-ke-ling-api",
      cwd: "/var/www/xia-ke-ling/api",
      script: "src/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
