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
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found');
      return;
    }
    res.writeHead(200);
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

  if (req.method === 'POST' && req.url === '/sync') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data?.payload?.codigo) {
          salas.set(data.payload.codigo, data.payload);
        }
        sendJson(res, 200, { ok: true });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: 'datos inválidos' });
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true, message: 'servidor listo' });
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/state/')) {
    const codigo = req.url.split('/state/')[1];
    const sala = salas.get(codigo);
    if (sala) {
      sendJson(res, 200, { ok: true, sala });
    } else {
      sendJson(res, 404, { ok: false, sala: null });
    }
    return;
  }

  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(root, decodeURIComponent(urlPath));
  serveFile(res, filePath);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Servidor de sincronización listo en http://0.0.0.0:${port}`);
});
