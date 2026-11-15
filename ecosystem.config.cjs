// pm2: app de producción en el VPS (puerto 3040, detrás de nginx)
module.exports = {
  apps: [{
    name: 'lemur',
    cwd: '/opt/lemur/current',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3040 -H 127.0.0.1',
    env: { NODE_ENV: 'production' },
    max_memory_restart: '600M',
  }],
};
