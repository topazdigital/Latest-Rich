module.exports = {
  apps: [
    {
      name: "rdn-api",
      script: "./artifacts/api-server/dist/index.mjs",
      interpreter: "node",
      cwd: "./",
      env_file: ".env",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
      },
      max_memory_restart: "512M",
      restart_delay: 3000,
      max_restarts: 10,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "~/.pm2/logs/rdn-api-error.log",
      out_file: "~/.pm2/logs/rdn-api-out.log",
    },
  ],
}
