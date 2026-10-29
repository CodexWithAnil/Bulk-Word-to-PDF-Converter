/**
 * CodexWithAnil — Local Development Server & Bulk Word-to-PDF Conversion Backend
 * Run using: npm start  OR  double-click Run_Word_To_PDF_Website.bat
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const { enhancePdfWithBorders } = require('./js/pdfPostProcessor.js');

const DEFAULT_PORT = 3000;
const ROOT_DIR = __dirname;
const TEMP_DIR = path.join(ROOT_DIR, 'temp_work');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.zip': 'application/zip',
};

// Helper: parse JSON body from incoming request with large payload support (up to 250MB for 50+ files)
function parseJsonBody(req, maxBytes = 250 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        const data = raw ? JSON.parse(raw) : {};
        resolve(data);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Clean helper to delete temp folder recursively
function safeRmDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (e) {
    // ignore clean up lock
  }
}

const server = http.createServer(async (req, res) => {
  // Enable CORS for local cross-origin if needed
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // =========================================================================
  // API ROUTES
  // =========================================================================

  // 1. Backend Status & Engine Health Check
  if (pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      engine: 'msword_native',
      message: 'Microsoft Word Native High-Fidelity Converter Ready',
      maxBulkFiles: 100
    }));
    return;
  }

  // 2. Load Sample Word Files for Instant 1-Click Testing
  if (pathname === '/api/load-samples' && req.method === 'GET') {
    const sampleDir = path.join(ROOT_DIR, 'sample_docs');
    const samples = [];
    if (fs.existsSync(sampleDir)) {
      const files = fs.readdirSync(sampleDir).filter(f => f.endsWith('.docx'));
      for (const f of files) {
        const fullPath = path.join(sampleDir, f);
        const data = fs.readFileSync(fullPath).toString('base64');
        samples.push({
          name: f,
          size: fs.statSync(fullPath).size,
          data: data
        });
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, samples }));
    return;
  }

  // 3. Batch Word to PDF Conversion (Handles 50+ Files in One Session)
  if (pathname === '/api/convert-batch' && req.method === 'POST') {
    const batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const batchDir = path.join(TEMP_DIR, batchId);

    try {
      fs.mkdirSync(batchDir, { recursive: true });
      const body = await parseJsonBody(req);
      const files = body.files || [];

      if (files.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'No files provided' }));
        safeRmDir(batchDir);
        return;
      }

      console.log(`[Batch Convert] Processing ${files.length} Word files...`);

      // Write input files and prepare JSON spec for Python Word COM converter
      const filePairs = [];
      const itemMap = {};

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        const safeName = (item.name || `doc_${i}.docx`).replace(/[^a-zA-Z0-9._-]/g, '_');
        const inExt = path.extname(safeName) || '.docx';
        const baseName = path.basename(safeName, inExt);

        const inPath = path.join(batchDir, `input_${i}_${safeName}`);
        const outPath = path.join(batchDir, `output_${i}_${baseName}.pdf`);

        const fileBuffer = Buffer.from(item.data, 'base64');
        fs.writeFileSync(inPath, fileBuffer);

        filePairs.push([inPath, outPath]);
        itemMap[inPath] = {
          id: item.id || `file_${i}`,
          name: item.name || `${baseName}.pdf`,
          pdfName: `${baseName}.pdf`,
          outPath: outPath
        };
      }

      const batchSpecPath = path.join(batchDir, 'batch_spec.json');
      fs.writeFileSync(batchSpecPath, JSON.stringify(filePairs, null, 2));

      // Execute Python converter
      const pyScript = path.join(ROOT_DIR, 'convert_service.py');
      const pyProc = spawn('python', [pyScript, '--json-batch', batchSpecPath]);

      let stdoutData = '';
      let stderrData = '';

      pyProc.stdout.on('data', (d) => { stdoutData += d.toString(); });
      pyProc.stderr.on('data', (d) => { stderrData += d.toString(); });

      pyProc.on('close', async (code) => {
        try {
          const results = [];
          for (const [inPath, outPath] of filePairs) {
            const meta = itemMap[inPath];
            if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
              let pdfBuffer = fs.readFileSync(outPath);
              try {
                const docxBuffer = fs.existsSync(inPath) ? fs.readFileSync(inPath) : null;
                const enhancedBytes = await enhancePdfWithBorders(pdfBuffer, docxBuffer);
                pdfBuffer = Buffer.from(enhancedBytes);
              } catch (enhanceErr) {
                console.warn('[Border Enhance Warning]', meta.name, enhanceErr.message);
              }

              results.push({
                id: meta.id,
                name: meta.name,
                pdfName: meta.pdfName,
                success: true,
                size: pdfBuffer.length,
                data: pdfBuffer.toString('base64')
              });
            } else {
              results.push({
                id: meta.id,
                name: meta.name,
                pdfName: meta.pdfName,
                success: false,
                error: 'Conversion failed or empty PDF produced'
              });
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            total: files.length,
            convertedCount: results.filter(r => r.success).length,
            results: results
          }));
        } catch (postErr) {
          console.error('[Batch Convert Error]', postErr);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: postErr.message }));
        } finally {
          safeRmDir(batchDir);
        }
      });

    } catch (err) {
      console.error('[API Batch Error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      safeRmDir(batchDir);
    }
    return;
  }

  // 4. Single File Word to PDF Conversion Endpoint
  if (pathname === '/api/convert-single' && req.method === 'POST') {
    const singleId = 'single_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const workDir = path.join(TEMP_DIR, singleId);

    try {
      fs.mkdirSync(workDir, { recursive: true });
      const body = await parseJsonBody(req);
      const fileName = (body.name || 'document.docx').replace(/[^a-zA-Z0-9._-]/g, '_');
      const inExt = path.extname(fileName) || '.docx';
      const baseName = path.basename(fileName, inExt);

      const inPath = path.join(workDir, `input_${fileName}`);
      const outPath = path.join(workDir, `${baseName}.pdf`);

      fs.writeFileSync(inPath, Buffer.from(body.data, 'base64'));

      const pyScript = path.join(ROOT_DIR, 'convert_service.py');
      const pyProc = spawn('python', [pyScript, '--single', inPath, outPath]);

      pyProc.on('close', async (code) => {
        try {
          if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
            let pdfBuffer = fs.readFileSync(outPath);
            try {
              const docxBuffer = fs.existsSync(inPath) ? fs.readFileSync(inPath) : null;
              const enhancedBytes = await enhancePdfWithBorders(pdfBuffer, docxBuffer);
              pdfBuffer = Buffer.from(enhancedBytes);
            } catch (enhanceErr) {
              console.warn('[Border Enhance Warning]', fileName, enhanceErr.message);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              pdfName: `${baseName}.pdf`,
              size: pdfBuffer.length,
              data: pdfBuffer.toString('base64')
            }));
          } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Could not convert Word document' }));
          }
        } finally {
          safeRmDir(workDir);
        }
      });
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      safeRmDir(workDir);
    }
    return;
  }

  // =========================================================================
  // STATIC FILE SERVING
  // =========================================================================
  const safeUrl = decodeURIComponent(pathname);
  const relativePath = safeUrl === '/' ? 'index.html' : safeUrl.replace(/^\/+/, '');
  const filePath = path.join(ROOT_DIR, relativePath);

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + safeUrl);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    res.end(content);
  });
});

function startServer(port) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log('\n============================================================');
    console.log('  🚀 CodexWithAnil — Bulk Word to PDF Suite is Running!');
    console.log(`  👉 Local URL: ${url}`);
    console.log('  ✨ Features: 50+ Bulk Word to PDF Conversion');
    console.log('  🎨 Color Theme: User-Friendly Eye-Care & Day Modes');
    console.log('  👉 Press Ctrl + C to stop the server');
    console.log('============================================================\n');

    // Automatically open in default browser on the active port
    const openCmd =
      process.platform === 'win32'
        ? `cmd /c start ${url}`
        : process.platform === 'darwin'
        ? `open ${url}`
        : `xdg-open ${url}`;

    try {
      exec(openCmd);
    } catch (e) {
      console.warn('Could not auto-open browser:', e.message);
    }
  });
}

startServer(DEFAULT_PORT);
