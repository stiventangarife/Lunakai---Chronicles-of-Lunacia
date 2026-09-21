const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8081;
const DIRECTORY = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Parse requested URL path
  let reqUrl = req.url.split('?')[0];

  if (req.method === 'POST' && reqUrl === '/api/save-portrait') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { name, dataUrl } = JSON.parse(body);
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const target = path.join(DIRECTORY, 'assets', 'portraits', `${name}.png`);
        fs.writeFileSync(target, base64Data, 'base64');
        console.log(`[Server] Saved portrait to ${target}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, path: target }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && reqUrl === '/api/save-image') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { relPath, dataUrl } = JSON.parse(body);
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const target = path.join(DIRECTORY, relPath);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, base64Data, 'base64');
        console.log(`[Server] Saved image to ${target}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, path: target }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (reqUrl === '/') reqUrl = '/index.html';

  // Decode URI components safely
  let safePath;
  try {
    safePath = path.normalize(decodeURIComponent(reqUrl)).replace(/^(\.\.[\/\\])+/, '');
  } catch (e) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  const filePath = path.join(DIRECTORY, safePath);

  // Prevent directory traversal
  if (!filePath.startsWith(DIRECTORY)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found: ' + reqUrl);
      return;
    }

    let actualFile = filePath;
    if (stats.isDirectory()) {
      actualFile = path.join(filePath, 'index.html');
    }

    const ext = path.extname(actualFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // HTTP Range request support for audio / media streaming
    const range = req.headers.range;
    if (range && (ext === '.mp3' || ext === '.wav')) {
      const totalSize = stats.size;
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      const chunkSize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });

      const stream = fs.createReadStream(actualFile, { start, end });
      stream.pipe(res);
      return;
    }

    res.setHeader('Accept-Ranges', 'bytes');
    fs.readFile(actualFile, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error reading file');
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Starting Lunakai Server on http://0.0.0.0:${PORT} from ${DIRECTORY}...`);
});
