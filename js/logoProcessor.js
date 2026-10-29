/**
 * CodexWithAnil — Watermark & Logo Image Processor (js/logoProcessor.js)
 * Automatically converts any uploaded image or assets/logo.jpg
 * into a transparent watermark suitable for white PDF pages.
 */

let processedWatermarkPng = null;
let processedBadgePng = null;

/**
 * Fallback Canvas Vector Watermark (works 100% offline)
 */
function createFallbackWatermark() {
  const size = 600;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  // Blue outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, 270, 0, Math.PI * 2);
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#0284c7';
  ctx.stroke();

  // "CA </>"
  ctx.lineWidth = 36;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0ea5e9';
  ctx.beginPath();
  ctx.arc(240, 215, 75, 0.28 * Math.PI, 1.72 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 34px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('</>', 238, 215);

  ctx.strokeStyle = '#0f172a';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(298, 275);
  ctx.lineTo(360, 140);
  ctx.lineTo(430, 282);
  ctx.stroke();

  // Text
  ctx.font = '800 52px Poppins, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('CodexWithAnil', cx, 365);

  ctx.font = '600 17px Inter, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('WEB DEVELOPMENT • TECH • LEARN • GROW', cx, 408);

  const url = canvas.toDataURL('image/png');
  return { transparentPng: url, badgePng: url };
}

/**
 * Loads an image from URL or Base64 and makes dark background transparent
 */
function prepareWatermarkImage(sourceUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const size = 600;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Draw image
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size * 0.47, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, 0, 0, size, size);
        ctx.restore();

        const imgData = ctx.getImageData(0, 0, size, size);
        const d = imgData.data;

        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          const a = d[i + 3];
          if (a === 0) continue;

          const brightness = r * 0.299 + g * 0.587 + b * 0.114;
          const maxC = Math.max(r, g, b);

          // If pixel is dark background, remove it
          if (brightness < 32 && maxC < 52) {
            d[i + 3] = 0;
          } else if (brightness < 65 && maxC < 88) {
            d[i + 3] = Math.round(((brightness - 32) / 33) * a);
          } else if (r > 200 && g > 200 && b > 200) {
            // Darken pure white text so it is clearly visible on white PDF
            d[i] = 15;
            d[i + 1] = 35;
            d[i + 2] = 75;
          }
        }
        ctx.putImageData(imgData, 0, 0);
        const transparentPng = canvas.toDataURL('image/png');

        // Circular Badge
        const canvasB = document.createElement('canvas');
        canvasB.width = 240;
        canvasB.height = 240;
        const ctxB = canvasB.getContext('2d');
        ctxB.beginPath();
        ctxB.arc(120, 120, 114, 0, Math.PI * 2);
        ctxB.clip();
        ctxB.drawImage(img, 0, 0, 240, 240);
        const badgePng = canvasB.toDataURL('image/png');

        processedWatermarkPng = transparentPng;
        processedBadgePng = badgePng;
        resolve({ transparentPng, badgePng });
      } catch (e) {
        const fb = createFallbackWatermark();
        processedWatermarkPng = fb.transparentPng;
        processedBadgePng = fb.badgePng;
        resolve(fb);
      }
    };

    img.onerror = () => {
      const fb = createFallbackWatermark();
      processedWatermarkPng = fb.transparentPng;
      processedBadgePng = fb.badgePng;
      resolve(fb);
    };

    img.src = sourceUrl || 'assets/logo.jpg';
  });
}
