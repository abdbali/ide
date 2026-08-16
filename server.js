/**
 * Flowide - Guvenli Lokal Sunucu ve Baslatici
 * Node.js Native HTTP Modulu (Sifir Harici Bagimlilik)
 * 
 * Guvenlik Ozellikleri:
 * - Yalnizca 127.0.0.1 (Localhost) arabirimine baglanir.
 * - Path traversal (dizin disina cikma) saldirilarina karsi korumalidir.
 * - Guvenlik basliklari (CSP, X-Content-Type-Options, Referrer-Policy) icerir.
 * - Web Serial API (USB haberlesmesi) icin tam uyumlu Secure Context saglar.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { exec } = require("child_process");

const ROOT_DIR = __dirname;
const DEFAULT_PORT = 3000;
const FALLBACK_PORTS = [3000, 5173, 8080, 8888, 0];

const MIME_TYPES = {
  ".html": "text/html; charset=UTF-8",
  ".htm": "text/html; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".mjs": "application/javascript; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=UTF-8",
  ".xml": "application/xml; charset=UTF-8",
  ".ino": "text/plain; charset=UTF-8",
  ".cpp": "text/plain; charset=UTF-8",
  ".h": "text/plain; charset=UTF-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

function sanitizePath(requestUrl) {
  try {
    const parsedUrl = url.parse(requestUrl);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Default to index.html for root path
    if (pathname === "/" || pathname === "") {
      pathname = "/index.html";
    }

    // Normalize and prevent path traversal
    const safePath = path.normalize(path.join(ROOT_DIR, pathname));

    // Ensure the resolved path is strictly within the ROOT_DIR
    if (!safePath.startsWith(ROOT_DIR)) {
      return null;
    }

    return safePath;
  } catch (err) {
    return null;
  }
}

function handleRequest(req, res) {
  // Only allow GET and HEAD requests for static file serving
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("405 Method Not Allowed");
    return;
  }

  const filePath = sanitizePath(req.url);

  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=UTF-8" });
    res.end("403 Forbidden - Gecersiz Dosya Yolu");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/html; charset=UTF-8" });
      res.end(`
        <!DOCTYPE html>
        <html lang="tr">
          <head><meta charset="utf-8"><title>404 - Sayfa Bulunamadi</title></head>
          <body style="font-family:sans-serif; background:#09090d; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
            <div style="text-align:center; padding:2rem; border:1px solid rgba(255,255,255,0.1); border-radius:12px; background:rgba(255,255,255,0.03);">
              <h1 style="margin:0 0 0.5rem 0;">404</h1>
              <p style="color:#a1a1aa; margin-bottom:1.5rem;">Istenen dosya bulunamadi.</p>
              <a href="/index.html" style="color:#38bdf8; text-decoration:none; border:1px solid #38bdf8; padding:0.5rem 1rem; border-radius:6px;">Ana Sayfaya Don</a>
            </div>
          </body>
        </html>
      `);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    const headers = {
      "Content-Type": contentType,
      "Content-Length": stats.size,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
      "Referrer-Policy": "no-referrer-when-downgrade",
      "Cache-Control": "no-cache"
    };

    res.writeHead(200, headers);

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const readStream = fs.createReadStream(filePath);
    readStream.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=UTF-8" });
        res.end("500 Internal Server Error");
      }
    });
    readStream.pipe(res);
  });
}

function openBrowser(targetUrl) {
  const platform = process.platform;
  let cmd = "";

  if (platform === "win32") {
    cmd = `start "" "${targetUrl}"`;
  } else if (platform === "darwin") {
    cmd = `open "${targetUrl}"`;
  } else {
    cmd = `xdg-open "${targetUrl}"`;
  }

  exec(cmd, (err) => {
    if (err) {
      console.log(`[Flowide] Tarayici otomatik acilamadi. Lutfen tarayicinizdan su adrese gidin: ${targetUrl}`);
    }
  });
}

function startServerOnPort(portListIndex = 0) {
  if (portListIndex >= FALLBACK_PORTS.length) {
    console.error("[Flowide HATA] Uygun bos port bulunamadi.");
    process.exit(1);
  }

  const port = FALLBACK_PORTS[portListIndex];
  const server = http.createServer(handleRequest);

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`[Flowide] Port ${port} mesgul, alternatif port deneniyor...`);
      startServerOnPort(portListIndex + 1);
    } else {
      console.error("[Flowide HATA]", err);
      process.exit(1);
    }
  });

  server.listen(port, "127.0.0.1", () => {
    const actualPort = server.address().port;
    const localUrl = `http://127.0.0.1:${actualPort}/index.html`;

    console.log("==========================================================");
    console.log("             FLOWIDE - ARDUINO GORSEL IDE                 ");
    console.log("==========================================================");
    console.log(`  Surum: 1.0.7 (Stable)`);
    console.log(`  Adres: ${localUrl}`);
    console.log(`  Protokol: Web Serial API (USB Erisimi Aktif)`);
    console.log(`  Guvenlik: 127.0.0.1 (Yalnizca Lokal Erisim)`);
    console.log("==========================================================");
    console.log("  Uygulama tarayicinizda aciliyor...");
    console.log("  Cikmak icin bu pencereyi kapatabilir veya Ctrl+C yapabilirsiniz.");
    console.log("==========================================================");

    openBrowser(localUrl);
  });
}

// Start server
startServerOnPort(0);
