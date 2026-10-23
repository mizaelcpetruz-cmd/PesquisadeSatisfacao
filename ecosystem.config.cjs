module.exports = {
  apps: [
    {
      name: "petruz-satisfacao",
      script: "node_modules/vite/bin/vite.js",
      args: "preview --host 0.0.0.0 --port 8080",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
