/**
 * CodexWithAnil — Presets & Settings State (js/presets.js)
 */

const STORAGE_KEY = 'codexWithAnil_cleanPreset_v4';

const DEFAULT_CONFIG = {
  // 1. Watermark (Background me clean watermark)
  watermarkType: 'image', // 'image' | 'text'
  watermarkText: 'CodexWithAnil',
  watermarkOpacity: 0.14,  // Subtle, non-intrusive background opacity
  watermarkSize: 52,       // % of page
  customWatermarkDataUrl: null, // Agar user apni image upload kare

  // 2. Formatting (Page Framing)
  enablePageBorder: true,  // Clean double border around the page
  showHeader: true,        // Top Header
  headerText: 'CodexWithAnil  •  WEB DEVELOPMENT | TECH | LEARN | GROW',
  showFooter: true,        // Bottom Footer
  footerText: 'Created by CodexWithAnil | Web Development • Tech • Learn • Grow',
  enablePageNumbers: true, // "Page X of Y" on bottom right

  // 3. Content Safety (ZERO CHED-CHAD WITH MIDDLE CONTENT)
  enableWhiteout: false,   // Default OFF taaki document text bilkul safe rahe
  topMaskHeight: 0,
  bottomMaskHeight: 0,
  standardizeA4: false,    // No page scaling distortion

  // 4. Automation
  autoProcessOnUpload: false,
};

let appConfig = { ...DEFAULT_CONFIG };

function loadSavedPreset() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      appConfig = { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.warn('Error reading from localStorage:', e);
  }
}

function savePreset() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appConfig));
  } catch (e) {
    console.warn('Error saving to localStorage:', e);
  }
}

function resetToDefault() {
  appConfig = { ...DEFAULT_CONFIG };
  savePreset();
}
