import http from 'node:http';

const port = Number(process.env.PORT || 8080);
const version = process.env.APP_VERSION || '1.0.0';
const commit = process.env.APP_COMMIT || 'local';

const server = http.createServer((request, response) => {
  if (request.url === '/healthz') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok', version, commit }));
    return;
  }

  if (request.url === '/') {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html><html><body><h1>SDLC Demo Node App</h1><p>Version ${version}</p><p>Commit ${commit}</p></body></html>`);
    return;
  }

  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(port, '127.0.0.1', () => {
  console.log(`sdlc-demo-node listening on 127.0.0.1:${port}`);
});

const shutdown = (signal) => {
  console.log(`received ${signal}; shutting down`);
  server.close(() => process.exit(0));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
