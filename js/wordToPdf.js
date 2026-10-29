/**
 * CodexWithAnil — Bulk Word to PDF Conversion Controller (js/wordToPdf.js)
 * Supports 50+ Word files (.docx and .doc) in a single batch.
 * Dual-Engine:
 *   1. Native MS Word COM Engine (via local server API for 100% exact fidelity)
 *   2. In-Browser Offline Engine (via Mammoth.js + html2pdf for zero-install client-side)
 */

(function () {
  'use strict';

  // Queue of Word files
  let wordQueue = [];
  let isConverting = false;
  let backendAvailable = false;
  let backendEngineInfo = null;

  // ---------------------------------------------------------------------------
  // 1. ENGINE HEALTH CHECK
  // ---------------------------------------------------------------------------
  async function checkBackendEngine() {
    const pill = document.getElementById('engineStatusPill');
    const pillText = document.getElementById('engineStatusText');

    // If opened directly via file:/// protocol (offline standalone mode)
    if (window.location.protocol === 'file:') {
      backendAvailable = false;
      if (pill && pillText) {
        pill.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30';
        pillText.innerHTML = '<span class="w-2 h-2 rounded-full bg-sky-500"></span><strong>In-Browser Engine:</strong> Active (Client-Side &amp; Offline)';
      }
      return;
    }

    try {
      const res = await fetch('/api/status', { method: 'GET', cache: 'no-cache' });
      if (res.ok) {
        const data = await res.json();
        backendAvailable = true;
        backendEngineInfo = data;
        if (pill && pillText) {
          pill.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30';
          pillText.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><strong>Native MS Word Engine:</strong> Active (100% Perfect Precision)';
        }
        return;
      }
    } catch (e) {
      // Backend not running (fallback)
    }

    backendAvailable = false;
    if (pill && pillText) {
      pill.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30';
      pillText.innerHTML = '<span class="w-2 h-2 rounded-full bg-sky-500"></span><strong>In-Browser Engine:</strong> Active (Client-Side &amp; Offline)';
    }
  }

  // ---------------------------------------------------------------------------
  // 2. FILE HELPERS
  // ---------------------------------------------------------------------------
  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 KB';
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function showToast(title, subtitle = '', type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const borderClass =
      type === 'error'
        ? 'border-rose-500/60 text-rose-600 dark:text-rose-300'
        : type === 'info'
        ? 'border-sky-500/60 text-sky-600 dark:text-sky-300'
        : 'border-emerald-500/60 text-emerald-600 dark:text-emerald-300';

    toast.className = `p-4 rounded-2xl bg-white/95 dark:bg-slate-900/95 border ${borderClass} shadow-xl backdrop-blur-xl transition-all duration-300 transform translate-y-2 max-w-sm`;
    toast.innerHTML = `
      <p class="text-sm font-bold text-slate-900 dark:text-white">${title}</p>
      ${subtitle ? `<p class="text-xs text-slate-600 dark:text-slate-300 mt-1">${subtitle}</p>` : ''}
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.remove('translate-y-2'));
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  // ---------------------------------------------------------------------------
  // 3. ADDING FILES (SUPPORTS 50+ FILES EASILY)
  // ---------------------------------------------------------------------------
  function handleWordFilesAdded(files) {
    const validFiles = Array.from(files).filter((f) => {
      const name = f.name.toLowerCase();
      return (
        name.endsWith('.docx') ||
        name.endsWith('.doc') ||
        f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        f.type === 'application/msword'
      );
    });

    if (validFiles.length === 0) {
      showToast('Kripya Word Files Select Karein', 'Sirf .docx aur .doc files support hoti hain.', 'error');
      return;
    }

    validFiles.forEach((file) => {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      wordQueue.push({
        id: 'word_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        file: file,
        name: file.name,
        pdfName: `${baseName}.pdf`,
        size: file.size,
        status: 'ready', // 'ready' | 'converting' | 'completed' | 'error'
        errorMsg: null,
        outputBlob: null,
      });
    });

    renderQueue();
    showToast(
      `${validFiles.length} Word File${validFiles.length > 1 ? 's' : ''} Added!`,
      `Total: ${wordQueue.length} files. Click "Convert All to PDF" to start.`,
      'info'
    );
  }

  // ---------------------------------------------------------------------------
  // 4. RENDER FILE QUEUE & STATS
  // ---------------------------------------------------------------------------
  function renderQueue() {
    const count = wordQueue.length;
    const completedCount = wordQueue.filter((x) => x.status === 'completed').length;
    const totalBytes = wordQueue.reduce((acc, x) => acc + (x.size || 0), 0);

    // Update Counter Chips
    const countChip = document.getElementById('wordCountChip');
    const sizeChip = document.getElementById('wordSizeChip');
    const doneChip = document.getElementById('wordDoneChip');

    if (countChip) countChip.textContent = `${count} Files`;
    if (sizeChip) sizeChip.textContent = formatBytes(totalBytes);
    if (doneChip) doneChip.textContent = `${completedCount} Converted`;

    // Elements toggle
    const emptyState = document.getElementById('wordEmptyState');
    const listContainer = document.getElementById('wordListContainer');
    const actionToolbar = document.getElementById('wordActionToolbar');
    const clearBtn = document.getElementById('wordClearAllBtn');
    const downloadZipBtn = document.getElementById('downloadAllZipBtn');
    const downloadDirectBtn = document.getElementById('downloadAllDirectBtn');

    if (emptyState) emptyState.classList.toggle('hidden', count > 0);
    if (listContainer) listContainer.classList.toggle('hidden', count === 0);
    if (actionToolbar) actionToolbar.classList.toggle('hidden', count === 0);
    if (clearBtn) clearBtn.classList.toggle('hidden', count === 0);

    // Both ZIP and Direct Download buttons enabled when at least 1 file is completed
    [downloadZipBtn, downloadDirectBtn].forEach((btn) => {
      if (btn) {
        if (completedCount > 0) {
          btn.removeAttribute('disabled');
          btn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
          btn.setAttribute('disabled', 'true');
          btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
      }
    });

    if (!listContainer || count === 0) return;

    listContainer.innerHTML = '';

    wordQueue.forEach((item, index) => {
      const row = document.createElement('div');
      row.className =
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 transition hover:border-indigo-400 dark:hover:border-indigo-500';

      // Left info
      const leftDiv = document.createElement('div');
      leftDiv.className = 'flex items-center gap-3 min-w-0 flex-1';

      // Icon: Word blue or PDF red
      const isDone = item.status === 'completed';
      const iconBg = isDone ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      const iconName = isDone ? 'file-check' : 'file-text';

      leftDiv.innerHTML = `
        <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}">
          <i data-lucide="${iconName}" class="w-5 h-5"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-400">#${index + 1}</span>
            <p class="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate" title="${item.name}">
              ${item.name}
            </p>
          </div>
          <div class="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>${formatBytes(item.size)}</span>
            <span>•</span>
            <span class="font-mono text-[11px] text-slate-600 dark:text-slate-300">➜ ${item.pdfName}</span>
          </div>
        </div>
      `;

      // Right status & action
      const rightDiv = document.createElement('div');
      rightDiv.className = 'flex items-center gap-2 shrink-0 self-end sm:self-auto';

      let statusBadge = '';
      if (item.status === 'ready') {
        statusBadge = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Ready</span>`;
      } else if (item.status === 'converting') {
        statusBadge = `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
            Converting...
          </span>
        `;
      } else if (item.status === 'completed') {
        statusBadge = `
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
            <i data-lucide="check" class="w-3.5 h-3.5"></i> Converted PDF
          </span>
        `;
      } else if (item.status === 'error') {
        statusBadge = `
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30" title="${item.errorMsg || 'Error'}">
            Failed
          </span>
        `;
      }

      rightDiv.innerHTML = statusBadge;

      // Single Download Button
      if (item.status === 'completed' && item.outputBlob) {
        const dlBtn = document.createElement('button');
        dlBtn.type = 'button';
        dlBtn.className =
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm';
        dlBtn.innerHTML = `<i data-lucide="download" class="w-3.5 h-3.5"></i> Download PDF`;
        dlBtn.onclick = () => {
          saveAs(item.outputBlob, item.pdfName);
          showToast('Downloaded!', item.pdfName, 'success');
        };
        rightDiv.appendChild(dlBtn);
      }

      // Remove single file button
      if (!isConverting) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition';
        removeBtn.title = 'Remove';
        removeBtn.innerHTML = `<i data-lucide="trash-2" class="w-4 h-4"></i>`;
        removeBtn.onclick = () => {
          wordQueue = wordQueue.filter((x) => x.id !== item.id);
          renderQueue();
        };
        rightDiv.appendChild(removeBtn);
      }

      row.appendChild(leftDiv);
      row.appendChild(rightDiv);
      listContainer.appendChild(row);
    });

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // ---------------------------------------------------------------------------
  // 5. IN-BROWSER CONVERSION ENGINE (FALLBACK / OFFLINE)
  // ---------------------------------------------------------------------------
  async function convertInBrowser(item) {
    // Uses Mammoth.js + html2pdf.js
    const arrayBuffer = await fileToArrayBuffer(item.file);
    const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
    const htmlContent = result.value;

    // Wrap in user-friendly A4 document layout
    const container = document.createElement('div');
    container.style.padding = '35px 45px';
    container.style.fontFamily = "'Inter', Arial, sans-serif";
    container.style.fontSize = '12pt';
    container.style.lineHeight = '1.6';
    container.style.color = '#111827';
    container.style.backgroundColor = '#ffffff';
    container.innerHTML = `
      <style>
        h1 { font-size: 22pt; font-weight: 700; margin-bottom: 12px; color: #1e293b; }
        h2 { font-size: 16pt; font-weight: 600; margin-top: 18px; margin-bottom: 8px; color: #334155; }
        h3 { font-size: 14pt; font-weight: 600; margin-top: 14px; margin-bottom: 6px; }
        p { margin-bottom: 12px; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
        th { background-color: #f1f5f9; font-weight: 600; }
        img { max-width: 100%; height: auto; margin: 12px 0; }
        ul, ol { padding-left: 24px; margin-bottom: 12px; }
        li { margin-bottom: 4px; }
      </style>
      ${htmlContent}
    `;

    // Render to PDF using html2pdf
    const opt = {
      margin: [10, 10, 10, 10],
      filename: item.pdfName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
    };

    const pdfBlob = await html2pdf().from(container).set(opt).outputPdf('blob');

    // Post-process with pdf-lib to add the crisp double page border & red footer box
    try {
      if (window.PDFLib) {
        const pdfArrayBuffer = await pdfBlob.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(pdfArrayBuffer);
        const pages = pdfDoc.getPages();
        for (const p of pages) {
          const { width, height } = p.getSize();

          // 1. Red Footer Border Box (Sized properly so it never touches content text)
          if (
            htmlContent.includes('SOLVED ASSIGNMENTS') ||
            htmlContent.includes('openeduindia') ||
            htmlContent.includes('9518220563') ||
            htmlContent.includes('ASSIGNMENT')
          ) {
            p.drawRectangle({
              x: 46,
              y: 48,
              width: width - 92,
              height: 54, // Adjusted from 73 to 54 so it never touches body text!
              borderColor: PDFLib.rgb(0.92, 0.15, 0.15),
              borderWidth: 1.4,
            });
            p.drawRectangle({
              x: 48,
              y: 50,
              width: width - 96,
              height: 50,
              borderColor: PDFLib.rgb(0.92, 0.15, 0.15),
              borderWidth: 0.6,
            });
          }

          // 2. Double Page Border
          p.drawRectangle({
            x: 22,
            y: 22,
            width: width - 44,
            height: height - 44,
            borderColor: PDFLib.rgb(0, 0, 0),
            borderWidth: 1.2,
          });
          p.drawRectangle({
            x: 25.5,
            y: 25.5,
            width: width - 51,
            height: height - 51,
            borderColor: PDFLib.rgb(0, 0, 0),
            borderWidth: 0.6,
          });

          // 3. First Page: Light dot-dash line below 'SOLVED ASSIGNMENT 2026-27'
          if (p === pages[0] && htmlContent.includes('SOLVED ASSIGNMENT')) {
            p.drawLine({
              start: { x: 46, y: 660 },
              end: { x: width - 46, y: 660 },
              thickness: 0.8,
              color: PDFLib.rgb(0.25, 0.25, 0.25),
              dashArray: [4, 2, 1.2, 2],
              opacity: 0.8,
            });
          }
        }

        const enhancedBytes = await pdfDoc.save();
        return new Blob([enhancedBytes], { type: 'application/pdf' });
      }
    } catch (e) {
      console.warn('In-browser border enhance fallback:', e);
    }

    return pdfBlob;
  }

  // ---------------------------------------------------------------------------
  // 6. NATIVE BACKEND CONVERSION (FOR 50+ FILES BATCH SPEED)
  // ---------------------------------------------------------------------------
  async function convertViaBackendBatch(items, onProgress) {
    // Process items in chunks of 20 to avoid exceeding JSON body limits on massive batches
    const chunkSize = 20;
    const allResults = [];

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);

      // Prepare payload
      const filePayloads = [];
      for (const item of chunk) {
        item.status = 'converting';
        renderQueue();
        const base64 = await fileToBase64(item.file);
        filePayloads.push({
          id: item.id,
          name: item.name,
          data: base64,
        });
      }

      onProgress(i, items.length, `Sending batch ${Math.floor(i / chunkSize) + 1} to Native MS Word Engine...`);

      const res = await fetch('/api/convert-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filePayloads }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Batch conversion failed on server');
      }

      // Match returned PDFs back to items
      for (const r of data.results) {
        const target = items.find((x) => x.id === r.id);
        if (target) {
          if (r.success && r.data) {
            const byteCharacters = atob(r.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let b = 0; b < byteCharacters.length; b++) {
              byteNumbers[b] = byteCharacters.charCodeAt(b);
            }
            const byteArray = new Uint8Array(byteNumbers);
            target.outputBlob = new Blob([byteArray], { type: 'application/pdf' });
            target.status = 'completed';

            // Permanently save to IndexedDB conversion history
            if (typeof saveToHistory === 'function') {
              try {
                await saveToHistory({
                  id: target.id,
                  name: target.pdfName,
                  size: target.outputBlob.size,
                  pages: 1,
                  pdfBlob: target.outputBlob,
                });
              } catch (histErr) {
                console.warn('History save error:', histErr);
              }
            }
          } else {
            target.status = 'error';
            target.errorMsg = r.error || 'Failed';
          }
        }
      }

      renderQueue();
    }
  }

  // ---------------------------------------------------------------------------
  // 7. MAIN BATCH CONVERSION RUNNER
  // ---------------------------------------------------------------------------
  async function startBulkConversion() {
    if (isConverting) return;
    const pendingItems = wordQueue.filter((x) => x.status !== 'completed');

    if (pendingItems.length === 0) {
      showToast('Sabhi Files Converted Hain!', 'Saare Word files already PDF me convert ho chuke hain.', 'info');
      return;
    }

    isConverting = true;

    // Show Progress Bar
    const progressBox = document.getElementById('wordProgressBox');
    const progressBar = document.getElementById('wordProgressBar');
    const progressPercent = document.getElementById('wordProgressPercent');
    const progressStatus = document.getElementById('wordProgressStatus');
    const convertBtn = document.getElementById('startWordConvertBtn');

    if (progressBox) progressBox.classList.remove('hidden');
    if (convertBtn) {
      convertBtn.setAttribute('disabled', 'true');
      convertBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    const totalToConvert = pendingItems.length;
    let completedSoFar = 0;

    function updateProgress(done, total, statusText) {
      const pct = Math.round((done / total) * 100);
      if (progressBar) progressBar.style.width = `${pct}%`;
      if (progressPercent) progressPercent.textContent = `${pct}%`;
      if (progressStatus) progressStatus.textContent = statusText || `Processing ${done} of ${total} files...`;
    }

    updateProgress(0, totalToConvert, 'Conversion shuru ho rahi hai...');

    // Attempt Native MS Word Backend first (High fidelity & fast 50+ batch)
    let usedBackend = false;
    if (backendAvailable) {
      try {
        await convertViaBackendBatch(pendingItems, (done, total, msg) => {
          updateProgress(done, total, msg);
        });
        usedBackend = true;
      } catch (backendErr) {
        console.warn('Backend batch conversion error, falling back to In-Browser engine:', backendErr);
        usedBackend = false;
      }
    }

    // Fallback: If backend not available or failed, run In-Browser Engine sequentially
    if (!usedBackend) {
      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        if (item.status === 'completed') continue;

        item.status = 'converting';
        renderQueue();
        updateProgress(i, totalToConvert, `Converting (${i + 1}/${totalToConvert}): ${item.name}...`);

        try {
          const pdfBlob = await convertInBrowser(item);
          item.outputBlob = pdfBlob;
          item.status = 'completed';

          // Permanently save to IndexedDB conversion history
          if (typeof saveToHistory === 'function') {
            try {
              await saveToHistory({
                id: item.id,
                name: item.pdfName,
                size: item.outputBlob.size,
                pages: 1,
                pdfBlob: item.outputBlob,
              });
            } catch (histErr) {
              console.warn('History save error:', histErr);
            }
          }
        } catch (err) {
          console.error('In-browser conversion error for', item.name, err);
          item.status = 'error';
          item.errorMsg = err.message;
        }

        completedSoFar++;
        updateProgress(completedSoFar, totalToConvert, `Done ${completedSoFar} of ${totalToConvert}`);
        renderQueue();
      }
    }

    updateProgress(totalToConvert, totalToConvert, '🎉 Conversion Complete! Sabhi 50+ files PDF ban chuki hain.');
    isConverting = false;

    if (convertBtn) {
      convertBtn.removeAttribute('disabled');
      convertBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    // Refresh history dashboard immediately
    if (typeof refreshHistoryDashboard === 'function') {
      try {
        await refreshHistoryDashboard();
      } catch (e) {}
    }

    renderQueue();
    showToast(
      'Conversion Complete!',
      `Successfully processed ${totalToConvert} Word document${totalToConvert > 1 ? 's' : ''}.`,
      'success'
    );
  }

  // ---------------------------------------------------------------------------
  // 8. 1-CLICK DIRECT DOWNLOAD ALL PDFS (NO ZIP)
  // ---------------------------------------------------------------------------
  async function downloadAllPdfsDirectly() {
    const completedItems = wordQueue.filter((x) => x.status === 'completed' && x.outputBlob);

    if (completedItems.length === 0) {
      showToast('Koi Converted PDF Nahi Hai', 'Pehle files ko convert karein.', 'error');
      return;
    }

    showToast('Direct Download Shuru...', `${completedItems.length} PDFs download ho rahi hain.`, 'info');

    for (let i = 0; i < completedItems.length; i++) {
      const item = completedItems[i];
      saveAs(item.outputBlob, item.pdfName);
      if (i < completedItems.length - 1) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    showToast('Download Complete!', `${completedItems.length} PDFs directly download ho gayi hain.`, 'success');
  }

  // ---------------------------------------------------------------------------
  // 9. 1-CLICK DOWNLOAD ALL CONVERTED PDFS AS ZIP
  // ---------------------------------------------------------------------------
  async function downloadAllAsZip() {
    const completedItems = wordQueue.filter((x) => x.status === 'completed' && x.outputBlob);

    if (completedItems.length === 0) {
      showToast('Koi Converted PDF Nahi Hai', 'Pehle files ko convert karein.', 'error');
      return;
    }

    showToast('ZIP File Ban Rahi Hai...', `${completedItems.length} PDFs ko bundle kiya ja raha hai.`, 'info');

    const zip = new JSZip();
    completedItems.forEach((item) => {
      zip.file(item.pdfName, item.outputBlob);
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const zipName = `CodexWithAnil_Converted_PDFs_${timestamp}.zip`;

    const zipContent = await zip.generateAsync({ type: 'blob' });
    saveAs(zipContent, zipName);
    showToast('ZIP Downloaded!', `${completedItems.length} PDFs download ho gaye.`, 'success');
  }

  // ---------------------------------------------------------------------------
  // 9. 1-CLICK LOAD 5 TEST WORD FILES
  // ---------------------------------------------------------------------------
  async function loadTestWordFiles() {
    try {
      showToast('Sample Files Load Ho Rahi Hain...', 'Creating 5 sample Word documents...', 'info');
      const res = await fetch('/api/load-samples');
      if (res.ok) {
        const data = await res.json();
        if (data.samples && data.samples.length > 0) {
          data.samples.forEach((sample) => {
            // Convert base64 back to File object
            const byteCharacters = atob(sample.data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            const file = new File([blob], sample.name, { type: blob.type });

            const baseName = sample.name.replace(/\.[^/.]+$/, '');
            wordQueue.push({
              id: 'sample_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
              file: file,
              name: sample.name,
              pdfName: `${baseName}.pdf`,
              size: sample.size,
              status: 'ready',
              errorMsg: null,
              outputBlob: null,
            });
          });

          renderQueue();
          showToast('5 Sample Word Files Ready!', 'Ab "Convert All to PDF" dabayein.', 'success');
          return;
        }
      }
    } catch (e) {
      // Server not connected
    }

    showToast('Server Se Sample Load Nahi Hua', 'Apne computer se .docx ya .doc files drag karein.', 'info');
  }

  // ---------------------------------------------------------------------------
  // 10. SETUP EVENT LISTENERS
  // ---------------------------------------------------------------------------
  function init() {
    checkBackendEngine();

    // Word Dropzone
    const dropzone = document.getElementById('wordDropzone');
    const fileInput = document.getElementById('wordFileInput');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleWordFilesAdded(e.target.files);
          fileInput.value = '';
        }
      });

      ['dragenter', 'dragover'].forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('drag-over');
        });
      });

      ['dragleave', 'drop'].forEach((eventName) => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('drag-over');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleWordFilesAdded(e.dataTransfer.files);
        }
      });
    }

    // Convert Button
    const convertBtn = document.getElementById('startWordConvertBtn');
    if (convertBtn) {
      convertBtn.addEventListener('click', startBulkConversion);
    }

    // Download All Direct Button (No ZIP)
    const downloadDirectBtn = document.getElementById('downloadAllDirectBtn');
    if (downloadDirectBtn) {
      downloadDirectBtn.addEventListener('click', downloadAllPdfsDirectly);
    }

    // Download All ZIP Button
    const downloadZipBtn = document.getElementById('downloadAllZipBtn');
    if (downloadZipBtn) {
      downloadZipBtn.addEventListener('click', downloadAllAsZip);
    }

    // Clear All Button
    const clearBtn = document.getElementById('wordClearAllBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (isConverting) return;
        wordQueue = [];
        renderQueue();
        const progressBox = document.getElementById('wordProgressBox');
        if (progressBox) progressBox.classList.add('hidden');
        showToast('Queue Cleared', 'Sabhi files queue se hata di gayi hain.', 'info');
      });
    }

    // Test Word Files Button
    const loadSampleBtn = document.getElementById('loadSampleWordBtn');
    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', loadTestWordFiles);
    }
  }

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
