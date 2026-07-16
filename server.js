const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const root = __dirname;
const salas = new Map();

const salaPredeterminada = {
  codigo: '2026COLE',
  estado: 'espera',
  precios: [
    { id: 1, emoji: '🍎', nombre: 'Manzana', precio: 1.50 },
    { id: 2, emoji: '🍌', nombre: 'Plátano', precio: 1.00 },
    { id: 3, emoji: '🍞', nombre: 'Pan', precio: 2.50 },
    { id: 4, emoji: '🥛', nombre: 'Leche', precio: 3.00 },
    { id: 5, emoji: '🍪', nombre: 'Galletas', precio: 2.00 },
    { id: 6, emoji: '🍫', nombre: 'Chocolate', precio: 2.50 },
    { id: 7, emoji: '🧃', nombre: 'Jugo', precio: 3.50 },
    { id: 8, emoji: '🧀', nombre: 'Queso', precio: 2.50 },
    { id: 9, emoji: '🥚', nombre: 'Huevos', precio: 4.00 },
    { id: 10, emoji: '🍚', nombre: 'Arroz', precio: 2.50 },
    { id: 11, emoji: '🥕', nombre: 'Zanahoria', precio: 1.50 },
    { id: 12, emoji: '🍉', nombre: 'Sandía', precio: 3.00 },
    { id: 13, emoji: '🧁', nombre: 'Cupcake', precio: 2.50 },
    { id: 14, emoji: '☕', nombre: 'Café', precio: 4.00 },
    { id: 15, emoji: '🍇', nombre: 'Uvas', precio: 3.00 },
    { id: 16, emoji: '🥪', nombre: 'Sandwich', precio: 4.50 }
  ],
  estudiantes: []
};

salas.set(salaPredeterminada.codigo, salaPredeterminada);

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
    req.setEncoding('utf8');
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const codigo = data?.codigo || data?.payload?.codigo;
        const sala = data?.room || data?.payload?.room;
        const estudiantes = data?.students || data?.payload?.students;

        if (codigo) {
          const existing = salas.get(codigo) || { codigo, estado: 'espera', precios: [], estudiantes: [], reinicioId: null };
          if (sala) {
            Object.assign(existing, sala);
          }
          if (Array.isArray(estudiantes)) {
            existing.estudiantes = estudiantes;
          }
          if (sala?.reinicioId) {
            existing.reinicioId = sala.reinicioId;
          }
          salas.set(codigo, existing);
        }

        sendJson(res, 200, { ok: true });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: 'datos inválidos', mensaje: error.message, body });
      }
    });
    return;
  }

  if (req.method === 'GET' && (req.url === '/health' || req.url === '/api/health')) {
    sendJson(res, 200, { ok: true, message: 'servidor listo' });
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && (parsedUrl.pathname.startsWith('/state/') || parsedUrl.pathname.startsWith('/api/state/'))) {
    const partes = parsedUrl.pathname.split('/').filter(Boolean);
    const codigo = partes[partes.length - 1];
    const sala = salas.get(codigo);
    if (sala) {
      sendJson(res, 200, { ok: true, sala });
    } else {
      sendJson(res, 404, { ok: false, sala: null });
    }
    return;
  }
  const urlPath = parsedUrl.pathname === '/' ? '/index.html' : parsedUrl.pathname;
  const filePath = path.join(root, decodeURIComponent(urlPath));
  serveFile(res, filePath);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Servidor de sincronización listo en http://0.0.0.0:${port}`);
});
