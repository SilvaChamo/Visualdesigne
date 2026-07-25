module.exports = {
  apps: [
    {
      name: 'visualdesign-site',
      script: 'node_modules/.bin/next',
      args: 'start -- -p 3003',
      cwd: '/opt/visualdesign-site',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
    },
  ],
};
