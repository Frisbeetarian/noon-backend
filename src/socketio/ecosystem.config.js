module.exports = {
  apps: [
    {
      name: 'socketio-cluster',
      script: 'cluster.ts',
      instances: 'max', // Use the maximum number of CPU cores
      exec_mode: 'cluster', // Enable clustering
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
}
