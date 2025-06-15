module.exports = {
  apps: [
    {
      name: 'rides-monitor',
      script: 'dist/app-monitoring.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      pid_file: './logs/pid.log',
      // Restart policy
      min_uptime: '10s',
      max_restarts: 10,
      // Cron restart (opcional - reinicia 1x por dia às 3:00 AM)
      cron_restart: '0 3 * * *'
    }
  ]
};
