module.exports = {
  apps: [
    {
      name: "rdn-api",
      script: "./artifacts/api-server/dist/index.mjs",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 8080,
        DATABASE_URL: "mysql://admin_testdating:EEhm0XRgtewBSUBditW7@localhost:3306/admin_testdating",
      },
      max_memory_restart: "512M",
      restart_delay: 3000,
      max_restarts: 10,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
}
