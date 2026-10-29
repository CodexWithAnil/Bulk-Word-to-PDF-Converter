/**
 * CodexWithAnil — Main Website Controller (js/app.js)
 * 
 * Features:
 * 1. Handles 50+ bulk PDFs simultaneously.
 * 2. Watermark is FIXED: "OPENEDU.INDIA" on every page!
 * 3. NO ZIP! Direct standard .pdf download with 1 single click.
 * 4. Full Dashboard & Conversion History (Re-download any PDF anytime).
 * 5. Original content 100% untouched.
 */

let fileQueue = [];
let isProcessing = false;

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
}

function showToast(title, subtitle = '', type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const borderClass =
    type === 'error'
      ? 'border-rose-500/60 text-rose-300'
      : type === 'info'
      ? 'border-sky-500/60 text-sky-300'
      : 'border-emerald-500/60 text-emerald-300';

  toast.className = `p-4 rounded-2xl bg-slate-900/95 border ${borderClass} shadow-2xl backdrop-blur-xl transition-all duration-300 transform translate-y-2`;
  toast.innerHTML = `
    <p class="text-sm font-bold text-white">${title}</p>
    ${subtitle ? `<p class="text-xs text-slate-300 mt-1">${subtitle}</p>` : ''}
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.remove('translate-y-2'));
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ---------------------------------------------------------------------------
// 1. FILE QUEUE & BATCH PROCESSING (50+ PDFs SUPPORT)
// ---------------------------------------------------------------------------

function handlePdfsAdded(files) {
  const pdfs = Array.from(files).filter(
    (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
  );

  if (pdfs.length === 0) {
    showToast('Sirf PDF Files Select Karein', 'Please select valid .pdf documents.', 'error');
    return;
  }

  pdfs.forEach((file) => {
    fileQueue.push({
      id: 'pdf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      file,
      name: file.name,
      size: file.size,
      status: 'ready',
      pages: null,
      outputBlob: null,
    });
  });

  renderQueue();
  showToast(`${pdfs.length} PDF${pdfs.length > 1 ? 's' : ''} Uploaded!`, 'Ab "⚡ 1-Click Apply CodexWithAnil Format" dabayein.', 'info');
}

function renderQueue() {
  const count = fileQueue.length;
  const countEl = document.getElementById('queueCountText') || document.getElementById('pdfQueueCount');
  if (countEl) countEl.textContent = `${count} Files Queued`;

  const clearBtn = document.getElementById('clearAllBtn');
  if (clearBtn) clearBtn.classList.toggle('hidden', count === 0);

  const emptyPrompt = document.getElementById('emptyQueuePrompt');
  if (emptyPrompt) emptyPrompt.classList.toggle('hidden', count > 0);

  const listEl = document.getElementById('queueListContainer') || document.getElementById('pdfListRows');
  if (listEl) listEl.classList.toggle('hidden', count === 0);

  const dlBar = document.getElementById('downloadBar');
  if (dlBar && count === 0) dlBar.classList.add('hidden');

  const progBox = document.getElementById('progressBox');
  if (progBox && count === 0) progBox.classList.add('hidden');

  if (!listEl) return;
  listEl.innerHTML = '';

  fileQueue.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800';

    let badge = '';
    if (item.status === 'ready') {
      badge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">Ready</span>`;
    } else if (item.status === 'processing') {
      badge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">Converting...</span>`;
    } else if (item.status === 'done') {
      badge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Done ✅</span>`;
    } else {
      badge = `<span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-300">Error ❌</span>`;
    }

    const pageCountText = item.pages ? ` • <span class="text-sky-400 font-semibold">${item.pages} Pages</span>` : '';

    row.innerHTML = `
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <span class="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 text-xs font-bold flex items-center justify-center shrink-0">
          ${idx + 1}
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-xs sm:text-sm font-semibold text-white truncate">${item.name}</p>
          <p class="text-[11px] text-slate-400">${formatBytes(item.size)}${pageCountText}</p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        ${badge}
        ${
          item.status === 'done'
            ? `
            <button type="button" data-action="view" data-id="${item.id}" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/30 text-xs font-semibold transition" title="Open PDF in new tab">
              👁️ View
            </button>
            <button type="button" data-action="save" data-id="${item.id}" class="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition" title="Download simple PDF directly">
              ⬇ Download PDF
            </button>
          `
            : ''
        }
        <button type="button" data-action="delete" data-id="${item.id}" class="p-1 text-slate-500 hover:text-rose-400 transition" title="Remove">
          ✕
        </button>
      </div>
    `;
    listEl.appendChild(row);
  });
}

/**
 * 1-Click Bulk Conversion (Processes 50+ PDFs sequentially without freezing)
 */
async function startBulkFormatting() {
  if (isProcessing) return;
  if (fileQueue.length === 0) {
    showToast('Pehle PDF Upload Karein!', 'Upar box mein apne assignment PDFs select karein.', 'error');
    return;
  }

  isProcessing = true;
  const btn = document.getElementById('primaryConvertBtn');
  btn.disabled = true;

  const progBox = document.getElementById('progressBox');
  const downBar = document.getElementById('downloadBar');
  progBox.classList.remove('hidden');
  downBar.classList.add('hidden');
  document.getElementById('progSpinner').classList.remove('hidden');

  const total = fileQueue.length;
  let doneCount = 0;
  let totalPages = 0;

  for (let i = 0; i < total; i++) {
    const item = fileQueue[i];
    item.status = 'processing';
    renderQueue();

    const pct = Math.round((i / total) * 100);
    document.getElementById('progStatusLabel').textContent = `Converting ${i + 1} of ${total} PDFs...`;
    document.getElementById('progPercentLabel').textContent = `${pct}%`;
    document.getElementById('progFillBar').style.width = `${pct}%`;
    document.getElementById('progSubLabel').textContent = `Formatting: ${item.name}`;

    try {
      const buf = await item.file.arrayBuffer();
      const { savedBytes, totalPages: pCount } = await formatSinglePdf(buf);
      const pdfBlob = new Blob([savedBytes], { type: 'application/pdf' });
      item.outputBlob = pdfBlob;
      item.pages = pCount;
      item.status = 'done';
      doneCount++;
      totalPages += pCount;
      document.getElementById('progPagesCounter').textContent = `${totalPages} pages converted`;

      // Save to IndexedDB Dashboard History automatically
      const outName = item.name.replace(/\.pdf$/i, '') + '_CodexWithAnil.pdf';
      await saveToHistory({
        id: item.id,
        name: outName,
        pages: pCount,
        size: pdfBlob.size,
        pdfBlob: pdfBlob,
      });

    } catch (e) {
      console.error('Error formatting PDF:', e);
      item.status = 'error';
    }

    await new Promise((r) => setTimeout(r, 20));
  }

  renderQueue();
  refreshHistoryDashboard();

  document.getElementById('progStatusLabel').textContent = `Completed ${doneCount} of ${total} PDFs! ✅`;
  document.getElementById('progPercentLabel').textContent = '100%';
  document.getElementById('progFillBar').style.width = '100%';
  document.getElementById('progSpinner').classList.add('hidden');

  isProcessing = false;
  btn.disabled = false;

  if (doneCount > 0) {
    downBar.classList.remove('hidden');
    document.getElementById('downSummaryText').textContent = `${doneCount} PDF${
      doneCount > 1 ? 's' : ''
    } (${totalPages} Pages) converted with "OPENEDU.INDIA" watermark! Standard PDF format me ready hain.`;
    showToast('Conversion Complete! 🎉', 'Ab "⚡ 1-Click Download All Converted PDFs" dabayein.', 'success');
  }
}

// ---------------------------------------------------------------------------
// 2. NO ZIP! DIRECT STANDARD .PDF 1-CLICK BULK DOWNLOADER
// ---------------------------------------------------------------------------

/**
 * Downloads all converted PDFs directly as standard .pdf files with 1 single click!
 */
function downloadAllPdfsDirectly() {
  const readyItems = fileQueue.filter((f) => f.status === 'done' && f.outputBlob);
  if (readyItems.length === 0) {
    showToast('Koi Converted PDF Ready Nahi Hai', '', 'error');
    return;
  }

  showToast('Downloading All PDFs...', `${readyItems.length} PDF files download ho rahi hain.`, 'info');

  readyItems.forEach((item, idx) => {
    // 250ms interval between files prevents browser download popup throttling
    setTimeout(() => {
      const outName = item.name.replace(/\.pdf$/i, '') + '_CodexWithAnil.pdf';
      saveAs(item.outputBlob, outName);
    }, idx * 250);
  });
}

// ---------------------------------------------------------------------------
// 3. DASHBOARD & CONVERSION HISTORY MANAGER
// ---------------------------------------------------------------------------

async function refreshHistoryDashboard() {
  const history = await getConversionHistory();
  const listContainer = document.getElementById('historyListContainer');
  const countBadge = document.getElementById('historyCountBadge');

  if (countBadge) {
    countBadge.textContent = `${history.length} Saved`;
  }

  if (!listContainer) return;

  if (history.length === 0) {
    listContainer.innerHTML = `
      <div class="pro-card p-12 text-center space-y-3">
        <div class="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
          <i data-lucide="history" class="w-6 h-6"></i>
        </div>
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Koi purana conversion record nahi hai
        </p>
        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
          Aap jo bhi Word files convert karenge, wo sabhi yahan automatically permanently save ho jayengi aur aap unhe kabhi bhi re-download kar sakte hain.
        </p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  listContainer.innerHTML = '';

  history.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className =
      'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-500 transition';

    row.innerHTML = `
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
          <i data-lucide="file-check" class="w-5 h-5"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-400">#${idx + 1}</span>
            <p class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate" title="${item.name}">
              ${item.name}
            </p>
          </div>
          <div class="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>${item.date || 'Saved'}</span>
            <span>•</span>
            <span>${formatBytes(item.size)}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        <button type="button" data-hist-act="view" data-hist-id="${item.id}" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition" title="View PDF in new tab">
          <i data-lucide="eye" class="w-3.5 h-3.5 text-sky-500"></i>
          <span>View</span>
        </button>
        <button type="button" data-hist-act="redownload" data-hist-id="${item.id}" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm" title="Re-download PDF">
          <i data-lucide="download" class="w-3.5 h-3.5"></i>
          <span>Download PDF</span>
        </button>
        <button type="button" data-hist-act="del" data-hist-id="${item.id}" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition" title="Remove">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `;

    listContainer.appendChild(row);
  });

  if (window.lucide) lucide.createIcons();
}

// ---------------------------------------------------------------------------
// 4. EVENT BINDINGS
// ---------------------------------------------------------------------------

function bindUiEvents() {
  const dropArea = document.getElementById('dropArea') || document.getElementById('pdfDropzone');
  if (dropArea) {
    ['dragenter', 'dragover'].forEach((e) => {
      dropArea.addEventListener(e, (ev) => {
        ev.preventDefault();
        dropArea.classList.add('dropzone-hover');
      });
    });

    ['dragleave', 'drop'].forEach((e) => {
      dropArea.addEventListener(e, (ev) => {
        ev.preventDefault();
        dropArea.classList.remove('dropzone-hover');
      });
    });

    dropArea.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        handlePdfsAdded(e.dataTransfer.files);
      }
    });

    dropArea.addEventListener('click', () => {
      const picker = document.getElementById('filePickerInput') || document.getElementById('pdfFileInput');
      if (picker) picker.click();
    });
  }

  const pickerInput = document.getElementById('filePickerInput') || document.getElementById('pdfFileInput');
  if (pickerInput) {
    pickerInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handlePdfsAdded(e.target.files);
        e.target.value = '';
      }
    });
  }

  const primBtn = document.getElementById('primaryConvertBtn') || document.getElementById('startPdfFormatBtn');
  if (primBtn) primBtn.addEventListener('click', startBulkFormatting);
  
  const dlAllBtn = document.getElementById('downloadAllDirectBtn');
  if (dlAllBtn) dlAllBtn.addEventListener('click', downloadAllPdfsDirectly);

  const loadDemo = async () => {
    const demos = await generateTestAssignmentPdfs();
    handlePdfsAdded(demos);
  };
  const demoBtn = document.getElementById('demoPdfsBtn');
  if (demoBtn) demoBtn.addEventListener('click', loadDemo);
  const emptyDemo = document.getElementById('emptyDemoBtn');
  if (emptyDemo) emptyDemo.addEventListener('click', loadDemo);

  const clearBtn = document.getElementById('clearAllBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      fileQueue = [];
      renderQueue();
    });
  }

  const qContainer = document.getElementById('queueListContainer') || document.getElementById('pdfListRows');
  if (qContainer) {
    qContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const item = fileQueue.find((f) => f.id === id);
      if (!item) return;

      if (action === 'delete') {
        fileQueue = fileQueue.filter((f) => f.id !== id);
        renderQueue();
      } else if (action === 'save' && item.outputBlob) {
        const outName = item.name.replace(/\.pdf$/i, '') + '_CodexWithAnil.pdf';
        saveAs(item.outputBlob, outName);
      } else if (action === 'view' && item.outputBlob) {
        window.open(URL.createObjectURL(item.outputBlob), '_blank');
      }
    });
  }

  // History Dashboard Actions (Re-download, View, Delete)
  const historyListEl = document.getElementById('historyListContainer') || document.getElementById('historyTableBody');
  if (historyListEl) {
    historyListEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-hist-act]');
      if (!btn) return;
      const act = btn.dataset.histAct;
      const id = btn.dataset.histId;

      const history = await getConversionHistory();
      const record = history.find((h) => h.id === id);
      if (!record) return;

      if (act === 'redownload') {
        saveAs(record.pdfBlob, record.name);
        showToast('PDF Downloaded! 📄', `${record.name} downloaded successfully.`, 'success');
      } else if (act === 'view') {
        window.open(URL.createObjectURL(record.pdfBlob), '_blank');
      } else if (act === 'del') {
        await deleteFromHistory(id);
        refreshHistoryDashboard();
        showToast('History item removed', '', 'info');
      }
    });
  }

  // Download All History Button
  const dlAllHistBtn = document.getElementById('downloadAllHistoryBtn');
  if (dlAllHistBtn) {
    dlAllHistBtn.addEventListener('click', async () => {
      const history = await getConversionHistory();
      if (history.length === 0) {
        showToast('History Khali Hai', 'Abhi koi saved PDF nahi hai.', 'info');
        return;
      }
      showToast('Downloading History...', `${history.length} PDFs download ho rahi hain.`, 'info');
      for (let i = 0; i < history.length; i++) {
        saveAs(history[i].pdfBlob, history[i].name);
        if (i < history.length - 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
      showToast('Download Complete!', 'Sabhi history PDFs download ho gayi.', 'success');
    });
  }

  // Clear All History Button
  const clearHistBtn = document.getElementById('clearHistoryBtn');
  if (clearHistBtn) {
    clearHistBtn.addEventListener('click', async () => {
      if (confirm('Kya aap saari conversion history delete karna chahte hain?')) {
        await clearAllHistory();
        refreshHistoryDashboard();
        showToast('History Cleared!', '', 'info');
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  if (typeof updateLivePreview === 'function') updateLivePreview();
  bindUiEvents();
  refreshHistoryDashboard();
});
