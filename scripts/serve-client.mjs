import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const port = Number(process.argv[2]) || 8765;
const root = path.resolve('client');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    let file = path.join(root, pathname === '/' ? 'index.html' : pathname);
    if (!fs.existsSync(file)) {
      if (fs.existsSync(path.join(root, 'pages', pathname))) {
        file = path.join(root, 'pages', pathname);
      } else if (fs.existsSync(path.join(root, 'src/js', pathname))) {
        file = path.join(root, 'src/js', pathname);
      } else if (fs.existsSync(path.join(root, 'src/styles', pathname))) {
        file = path.join(root, 'src/styles', pathname);
      }
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end('Not Found');
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    res.writeHead(500).end(err.message);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`1UP Client Server running on http://127.0.0.1:${port}`);
});
