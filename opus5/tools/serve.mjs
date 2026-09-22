/**
 * 局域网静态服务器（零依赖）。
 * 相比 `python3 -m http.server`：正确的 MIME、关闭目录列表、拒绝越界路径与隐藏文件，
 * 并且启动时把局域网地址直接打出来。
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 8123);
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

function send(res, code, body, headers = {}) {
  res.writeHead(code, { 'Cache-Control': 'no-cache', ...headers });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, 'Bad Request');
  }
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  // 拒绝隐藏文件与越界路径
  if (urlPath.split('/').some((seg) => seg.startsWith('.') && seg !== '')) {
    return send(res, 403, 'Forbidden');
  }
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT + path.sep)) return send(res, 403, 'Forbidden');

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, 'Not Found');
    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

function lanAddresses() {
  const out = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      const tailscale = a.address.startsWith('100.') && name.startsWith('utun');
      out.push({ name, address: a.address, tailscale });
    }
  }
  return out;
}

server.listen(PORT, HOST, () => {
  const w = (s) => `\x1b[38;5;214m${s}\x1b[0m`;
  console.log(`\n  U.S.S. Enterprise NCC-1701-D\n`);
  console.log(`  本机    ${w(`http://localhost:${PORT}`)}`);
  for (const { name, address, tailscale } of lanAddresses()) {
    const label = tailscale ? '隧道' : '局域网';
    console.log(`  ${label}  ${w(`http://${address}:${PORT}`)}   (${name})`);
  }
  console.log(`\n  Ctrl+C 停止\n`);
});
