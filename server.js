const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const root = __dirname;
const salas = new Map();

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
  setCors(res);
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function serveFile(res, filePath) {
  setCors(res);
  const contentType = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  }[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && (req.url === '/sync' || req.url === '/api/sync')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const codigo = data?.codigo || data?.payload?.codigo;
        const sala = data?.room || data?.payload?.room;
        const estudiantes = data?.students || data?.payload?.students;

        if (codigo) {
          const existing = salas.get(codigo) || { codigo, estado: 'espera', precios: [], estudiantes: [] };
          if (sala) {
            Object.assign(existing, sala);
          }
          if (Array.isArray(estudiantes)) {
            existing.estudiantes = estudiantes;
          }
          salas.set(codigo, existing);
        }

        sendJson(res, 200, { ok: true });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: 'datos inválidos' });
      }
    });
    return;
  }

  if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/health')) {
    sendJson(res, 200, { ok: true, message: 'servidor listo' });
    return;
  }

  if (req.method === 'GET' && (req.url.startsWith('/state/') || req.url.startsWith('/api/state/'))) {
    const codigo = req.url.split('/state/')[1] || req.url.split('/api/state/')[1];
    const sala = salas.get(codigo);
    if (sala) {
      sendJson(res, 200, { ok: true, sala });
    } else {
      sendJson(res, 404, { ok: false, sala: null });
    }
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const urlPath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
  const filePath = path.join(root, decodeURIComponent(urlPath));
  serveFile(res, filePath);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Servidor de sincronización listo en http://0.0.0.0:${port}`);
});
