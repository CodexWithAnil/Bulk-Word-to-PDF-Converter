/**
 * CodexWithAnil — Live Preview & UI Sync (js/preview.js)
 */

function updateLivePreview() {
  // Border Frame
  const borderEl = document.getElementById('prevBorderBox');
  if (borderEl) {
    borderEl.style.display = 'block';
  }

  // Header Text
  const headerTextEl = document.getElementById('prevHeaderText');
  if (headerTextEl) {
    headerTextEl.textContent = 'CodexWithAnil • WEB DEVELOPMENT | TECH | LEARN | GROW';
  }

  // Footer & Page Number
  const footerTextEl = document.getElementById('prevFooterText');
  if (footerTextEl) {
    footerTextEl.textContent = 'Created by CodexWithAnil | Web Development • Tech • Learn • Grow';
  }

  const pageNumEl = document.getElementById('prevPageNum');
  if (pageNumEl) {
    pageNumEl.style.display = 'inline';
  }

  // Watermark: Always "OPENEDU.INDIA"
  const wmWrap = document.getElementById('prevWatermarkWrap');
  if (wmWrap) {
    wmWrap.innerHTML = `
      <div style="transform: rotate(-45deg); opacity: 0.16;" class="font-display font-extrabold text-sky-800 text-lg tracking-wider pointer-events-none select-none whitespace-nowrap">
        OPENEDU.INDIA
      </div>
    `;
  }
}
