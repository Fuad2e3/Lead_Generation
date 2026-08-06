/* ==========================================================================
   WEBSITE DATA MINER - Smart Parameter Formatter & Multi-Exporter v2.5
   Features:
     - Dynamic Toolbar Controls: Automatically switches between Start, Pause,
       Resume, Stop & Start New Session buttons based on mining status.
     - Dynamic Export Builder: Respects selected checkboxes (Home, About, Contact,
       Services, Phone, Email, Social, Keywords) in all export files (.xlsx, .csv, .pdf, .json, .txt).
     - Beautiful Text Cleaning & Summarizer (Removes code, scripts, raw HTML artifacts).
     - Phone Number & Email Formatting System.
     - Direct Native Fetch Mode (No Proxy) with Multi-Proxy Racer Fallback.
     - 15x Parallel Worker Pool & Sub-page Parallel Crawling.
     - LocalStorage History Persistence.
   ========================================================================== */

(function () {
  'use strict';

  // ─── Global State ────────────────────────────────────────────────────────
  const state = {
    urls: [],
    duplicates: 0,
    tasks: [],
    currentIndex: 0,
    activeWorkers: 0,
    concurrency: 15,
    isRunning: false,
    isPaused: false,
    startTime: null,
    timerInterval: null,
    language: 'en',
    theme: 'dark',
    chart: null,
    history: []
  };

  // ─── Translations ────────────────────────────────────────────────────────
  const translations = {
    en: {
      app_title: 'Lead Generation',
      start_heading: 'Start Website Mining & Automation',
      start_subheading: 'Paste website URLs or upload TXT/CSV/XLSX files to extract Emails, Phones, Social Links, and Page text instantly.',
      input_heading: '1. Input Website URLs',
      dropzone_msg: 'Drag & Drop .txt, .csv, or .xlsx website list here',
      browse_btn: 'Browse Files',
      manual_urls_label: 'Or Paste URLs/Raw text directly:',
      options_heading: '2. Extraction Parameters',
      start_btn: 'Launch Mining Session',
      nav_home: 'Home & Scraper',
      nav_automation: 'Live Tracker',
      nav_history: 'History',
      nav_settings: 'Settings',
      live_tracker_title: 'Live Mining Execution',
      history_title: 'Saved Mining Sessions',
      settings_title: 'Application Preferences'
    },
    bn: {
      app_title: 'ওয়েবসাইট ডেটা মাইনার',
      start_heading: 'অটোমেশন ও মাইনিং শুরু করুন',
      start_subheading: 'ওয়েবসাইট লিংক পেস্ট বা TXT/CSV/XLSX ফাইল আপলোড করে ইমেইল, ফোন, সোশ্যাল লিংক এক্সট্র্যাক্ট করুন।',
      input_heading: '১. ওয়েবসাইট URL ইনপুট',
      dropzone_msg: '.txt, .csv, অথবা .xlsx ফাইল এখানে ড্র্যাগ ও ড্রপ করুন',
      browse_btn: 'ফাইল ব্রাউজ করুন',
      manual_urls_label: 'অথবা টেক্সট/লিংক পেস্ট করুন (অটোমেটিক URL ফিল্টার হবে):',
      options_heading: '২. এক্সট্র্যাকশন প্যারামিটার',
      start_btn: 'অটোমেশন শুরু করুন',
      nav_home: 'হোম ও স্ক্র্যাপার',
      nav_automation: 'লাইভ ট্র্যাক',
      nav_history: 'হিস্ট্রি',
      nav_settings: 'সেটিংস',
      live_tracker_title: 'লাইভ এক্সিকিউশন ট্র্যাকার',
      history_title: 'সেভ হওয়া মাইনিং সেশন',
      settings_title: 'অ্যাপ্লিকেশন সেটিংস'
    }
  };

  // ─── DOM Selectors ───────────────────────────────────────────────────────
  const DOM = {
    navBtns: document.querySelectorAll('.nav-btn'),
    tabPages: document.querySelectorAll('.tab-page'),
    btnLang: document.getElementById('btn-lang'),
    langLabel: document.getElementById('lang-label'),
    btnTheme: document.getElementById('btn-theme'),

    fileDropzone: document.getElementById('file-dropzone'),
    fileInput: document.getElementById('file-input'),
    fileInfo: document.getElementById('file-info'),
    fileName: document.getElementById('file-name'),
    btnRemoveFile: document.getElementById('btn-remove-file'),
    urlTextarea: document.getElementById('url-textarea'),
    detectedCount: document.getElementById('detected-urls-count'),
    duplicatesWarning: document.getElementById('duplicate-warning'),
    duplicatesCount: document.getElementById('duplicates-count'),
    btnStartMining: document.getElementById('btn-start-mining'),

    chkHome: document.getElementById('chk-home'),
    chkAbout: document.getElementById('chk-about'),
    chkContact: document.getElementById('chk-contact'),
    chkServices: document.getElementById('chk-services'),
    chkPhone: document.getElementById('chk-phone'),
    chkEmail: document.getElementById('chk-email'),
    chkSocial: document.getElementById('chk-social'),
    chkSkipDup: document.getElementById('chk-skip-dup'),
    customKeywordsInput: document.getElementById('custom-keywords-input'),
    speedBtns: document.querySelectorAll('.speed-btn'),

    sessionStatusBadge: document.getElementById('session-status-badge'),
    btnPause: document.getElementById('btn-pause'),
    btnResume: document.getElementById('btn-resume'),
    btnStop: document.getElementById('btn-stop'),
    btnRestart: document.getElementById('btn-restart'),
    btnRetryFailed: document.getElementById('btn-retry-failed'),
    btnExportToolbar: document.getElementById('btn-export-toolbar'),
    lblProcessed: document.getElementById('lbl-processed-sites'),
    lblTotal: document.getElementById('lbl-total-sites'),
    lblPercentage: document.getElementById('lbl-percentage'),
    progressBarFill: document.getElementById('progress-bar-fill'),
    lblElapsedTime: document.getElementById('lbl-elapsed-time'),
    lblActiveProxy: document.getElementById('lbl-active-proxy'),

    statTotal: document.getElementById('stat-total'),
    statDone: document.getElementById('stat-done'),
    statError: document.getElementById('stat-error'),
    statSkipped: document.getElementById('stat-skipped'),

    consoleLog: document.getElementById('console-log'),
    btnClearLog: document.getElementById('btn-clear-log'),
    tableBody: document.getElementById('table-body'),
    tableSearch: document.getElementById('table-search'),
    btnCleanData: document.getElementById('btn-clean-data'),

    historyTableBody: document.getElementById('history-table-body'),
    btnClearHistory: document.getElementById('btn-clear-history'),
    proxySelect: document.getElementById('proxy-select'),
    chkSound: document.getElementById('chk-sound'),

    modalExport: document.getElementById('modal-export'),
    btnCloseExport: document.getElementById('btn-close-export'),
    modalDetail: document.getElementById('modal-detail'),
    btnCloseDetail: document.getElementById('btn-close-detail'),
    btnBackDetail: document.getElementById('btn-back-detail'),
    detailModalTitle: document.getElementById('detail-modal-title'),
    detailModalBody: document.getElementById('detail-modal-body'),

    exportExcel: document.getElementById('export-excel'),
    exportCsv: document.getElementById('export-csv'),
    exportPdf: document.getElementById('export-pdf'),
    exportJson: document.getElementById('export-json'),
    exportTxt: document.getElementById('export-txt')
  };

  // ─── Fast Proxy Catalog ──────────────────────────────────────────────────
  const PROXY_LIST = [
    (url) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
    (url) => `https://thingproxy.freeboard.io/fetch/${url}`
  ];

  // ─── Initialization ──────────────────────────────────────────────────────
  function init() {
    setupTabNavigation();
    setupFileUpload();
    setupInputListeners();
    setupControls();
    setupExporters();
    initChart();
    loadHistoryFromStorage();
    setToolbarState('idle');
    addLog('⚡ Smart Scraper initialized. Toolbar state synced.', 'system');
  }

  // ─── Tab Navigation ──────────────────────────────────────────────────────
  function setupTabNavigation() {
    DOM.navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        DOM.navBtns.forEach(b => b.classList.remove('active'));
        DOM.tabPages.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetEl = document.getElementById(targetTab);
        if (targetEl) targetEl.classList.add('active');

        if (targetTab === 'tab-automation' && state.chart) {
          setTimeout(() => state.chart.resize(), 100);
        }
      });
    });

    if (DOM.btnLang) {
      DOM.btnLang.addEventListener('click', () => {
        state.language = state.language === 'en' ? 'bn' : 'en';
        DOM.langLabel.textContent = state.language === 'en' ? 'English' : 'বাংলা (BN)';
        applyTranslations();
      });
    }

    if (DOM.btnTheme) {
      DOM.btnTheme.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.theme);
        DOM.btnTheme.innerHTML = state.theme === 'dark'
          ? '<i class="fa-solid fa-moon"></i>'
          : '<i class="fa-solid fa-sun color-warning"></i>';

        if (state.chart) {
          const textColor = state.theme === 'dark' ? '#9E9EB3' : '#4A4A68';
          state.chart.options.plugins.legend.labels.color = textColor;
          state.chart.update();
        }
      });
    }
  }

  function applyTranslations() {
    const dict = translations[state.language];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict && dict[key]) el.textContent = dict[key];
    });
  }

  // ─── Toolbar State Machine ───────────────────────────────────────────────
  function setToolbarState(status) {
    // status: 'running', 'paused', 'idle', 'completed', 'stopped'
    if (!DOM.btnPause || !DOM.btnResume || !DOM.btnStop || !DOM.btnRestart) return;

    if (status === 'running') {
      DOM.btnPause.classList.remove('hidden');
      DOM.btnPause.disabled = false;
      DOM.btnResume.classList.add('hidden');
      DOM.btnStop.classList.remove('hidden');
      DOM.btnStop.disabled = false;
      DOM.btnRestart.classList.add('hidden');
    } else if (status === 'paused') {
      DOM.btnPause.classList.add('hidden');
      DOM.btnResume.classList.remove('hidden');
      DOM.btnResume.disabled = false;
      DOM.btnStop.classList.remove('hidden');
      DOM.btnStop.disabled = false;
      DOM.btnRestart.classList.add('hidden');
    } else {
      // idle, completed, stopped
      DOM.btnPause.classList.add('hidden');
      DOM.btnResume.classList.add('hidden');
      DOM.btnStop.classList.add('hidden');
      DOM.btnRestart.classList.remove('hidden');
      DOM.btnRestart.disabled = false;
    }
  }

  // ─── Smart URL Extractor & Validator ─────────────────────────────────────
  function isValidDomainOrUrl(str) {
    if (!str || typeof str !== 'string') return false;
    const clean = str.trim();
    if (clean.length < 4 || /\s/.test(clean)) return false;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return false; // Exclude emails

    const domainPattern = /^(?:https?:\/\/)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?::\d+)?(?:\/[^\s]*)?$/i;
    return domainPattern.test(clean);
  }

  function extractUrlsFromText(rawText) {
    if (!rawText) return [];
    const urlPattern = /(?:https?:\/\/)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?::\d+)?(?:\/[^\s"'<>]*)?/gi;
    const matches = rawText.match(urlPattern) || [];

    const results = [];
    matches.forEach(match => {
      let clean = match.trim().replace(/[.,;:!?)]+$/, '');
      if (clean.includes('@') && !clean.startsWith('http')) return;
      if (isValidDomainOrUrl(clean)) {
        results.push(clean);
      }
    });

    return results;
  }

  function setupInputListeners() {
    if (DOM.urlTextarea) {
      DOM.urlTextarea.addEventListener('input', parseInputURLs);
      DOM.urlTextarea.addEventListener('change', parseInputURLs);
      DOM.urlTextarea.addEventListener('keyup', parseInputURLs);
      DOM.urlTextarea.addEventListener('blur', parseInputURLs);
      DOM.urlTextarea.addEventListener('paste', () => setTimeout(parseInputURLs, 50));
    }

    DOM.speedBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.speedBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const delaySec = parseFloat(btn.getAttribute('data-delay'));
        if (delaySec <= 0.3) state.concurrency = 20;       // Ultra (20 workers)
        else if (delaySec <= 0.8) state.concurrency = 15; // Turbo (15 workers)
        else state.concurrency = 10;                      // Fast (10 workers)
      });
    });
  }

  function getDomainHostname(urlStr) {
    try {
      let clean = urlStr.trim().toLowerCase();
      if (!/^https?:\/\//i.test(clean)) clean = 'https://' + clean;
      const parsed = new URL(clean);
      return parsed.hostname.replace(/^www\./i, '');
    } catch (_) {
      return urlStr.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split('?')[0];
    }
  }

  function parseInputURLs() {
    if (!DOM.urlTextarea) return;
    const rawText = DOM.urlTextarea.value || '';
    if (!rawText.trim()) {
      state.urls = [];
      state.duplicates = 0;
      if (DOM.detectedCount) DOM.detectedCount.textContent = '0';
      if (DOM.duplicatesWarning) DOM.duplicatesWarning.classList.add('hidden');
      return;
    }

    let extractedCandidates = extractUrlsFromText(rawText);

    if (extractedCandidates.length === 0) {
      const lineTokens = rawText.split(/[\r\n,;\s]+/).map(t => t.trim()).filter(t => t.length > 3);
      lineTokens.forEach(token => {
        if (isValidDomainOrUrl(token)) extractedCandidates.push(token);
      });
    }

    const validUrls = [];
    const seen = new Set();
    let dupes = 0;

    extractedCandidates.forEach(cand => {
      let formatted = cand.trim();
      if (!formatted) return;
      if (!/^https?:\/\//i.test(formatted)) formatted = 'https://' + formatted;

      const domain = getDomainHostname(formatted);
      if (seen.has(domain)) {
        dupes++;
        validUrls.push({ original: cand, url: formatted, domain: domain, isDuplicate: true });
      } else {
        seen.add(domain);
        validUrls.push({ original: cand, url: formatted, domain: domain, isDuplicate: false });
      }
    });

    state.urls = validUrls;
    state.duplicates = dupes;

    if (DOM.detectedCount) DOM.detectedCount.textContent = validUrls.length;
    if (DOM.duplicatesWarning && DOM.duplicatesCount) {
      DOM.duplicatesCount.textContent = dupes;
      if (dupes > 0) {
        DOM.duplicatesWarning.classList.remove('hidden');
      } else {
        DOM.duplicatesWarning.classList.add('hidden');
      }
    }
  }

  // ─── File Upload & Excel Support ──────────────────────────────────────────
  function setupFileUpload() {
    const dropzone = DOM.fileDropzone;
    if (!dropzone) return;

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
    });

    if (DOM.fileInput) {
      DOM.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFileSelect(e.target.files[0]);
      });
    }

    if (DOM.btnRemoveFile) {
      DOM.btnRemoveFile.addEventListener('click', (e) => {
        e.stopPropagation();
        if (DOM.fileInput) DOM.fileInput.value = '';
        if (DOM.fileInfo) DOM.fileInfo.classList.add('hidden');
        if (DOM.urlTextarea) DOM.urlTextarea.value = '';
        parseInputURLs();
      });
    }
  }

  function handleFileSelect(file) {
    if (DOM.fileName) DOM.fileName.textContent = file.name;
    if (DOM.fileInfo) DOM.fileInfo.classList.remove('hidden');

    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          const rawText = json.map(r => Array.isArray(r) ? r.join(' ') : String(r)).join('\n');
          const extractedUrls = extractUrlsFromText(rawText);

          if (DOM.urlTextarea) DOM.urlTextarea.value = extractedUrls.join('\n');
          parseInputURLs();
          addLog(`Excel spreadsheet imported: ${file.name} (${extractedUrls.length} valid URLs found)`, 'success');
        } catch (err) {
          addLog(`Failed to parse Excel file: ${err.message}`, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawText = e.target.result;
        const extractedUrls = extractUrlsFromText(rawText);
        if (DOM.urlTextarea) DOM.urlTextarea.value = extractedUrls.join('\n');
        parseInputURLs();
        addLog(`File uploaded: ${file.name} (${extractedUrls.length} valid URLs found)`, 'success');
      };
      reader.readAsText(file);
    }
  }

  // ─── Direct Native Fetch & Proxy Fallback Engine ─────────────────────────
  async function fetchDirectNative(targetUrl, timeoutMs = 2500) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(targetUrl, { signal: controller.signal, mode: 'cors' });
      clearTimeout(timerId);
      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 50) return text;
      }
    } catch (_) {
      clearTimeout(timerId);
    }
    return null;
  }

  async function fetchSingleProxy(proxyFn, targetUrl, timeoutMs) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fetchUrl = proxyFn(targetUrl);
      const resp = await fetch(fetchUrl, { signal: controller.signal });
      clearTimeout(timerId);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      let text = await resp.text();
      if (!text || text.length < 50) throw new Error('Empty response');

      if (text.trim().startsWith('{') && text.includes('"contents"')) {
        try {
          const parsed = JSON.parse(text);
          if (parsed.contents) text = parsed.contents;
        } catch (_) { }
      }

      if (text && text.length > 50 && (text.includes('<') || text.includes('http') || text.includes('@'))) {
        return text;
      }
      throw new Error('Invalid HTML');
    } catch (err) {
      clearTimeout(timerId);
      throw err;
    }
  }

  async function fetchWithParallelProxies(targetUrl, timeoutMs = 2500) {
    if (DOM.lblActiveProxy) DOM.lblActiveProxy.textContent = 'Ultra-Fast Parallel Racer (Direct + Proxy)';

    const promises = [
      fetchDirectNative(targetUrl, 2000),
      ...PROXY_LIST.map(fn => fetchSingleProxy(fn, targetUrl, timeoutMs))
    ];

    try {
      const html = await Promise.any(promises);
      return html;
    } catch (_) {
      return null;
    }
  }

  // ─── Advanced Data Extractors & Formatter ────────────────────────────────
  function decodeHtmlEntities(str) {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  function cleanAndFormatSectionText(text) {
    if (!text || text === 'N/A' || text === 'Not Found' || text === 'Pending...' || text === 'Undefined') return 'N/A';

    let cleaned = String(text);

    // 1. Decode HTML entities (&nbsp;, &amp;, &quot;, &#39;, &copy;, etc.)
    cleaned = decodeHtmlEntities(cleaned);

    // 2. Strip scripts, styles, svg, iframe, noscript, canvas, nav, header, footer tags AND their contents
    cleaned = cleaned
      .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, ' ')
      .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, ' ')
      .replace(/<noscript\b[^<]*>([\s\S]*?)<\/noscript>/gi, ' ')
      .replace(/<svg\b[^<]*>([\s\S]*?)<\/svg>/gi, ' ')
      .replace(/<iframe\b[^<]*>([\s\S]*?)<\/iframe>/gi, ' ')
      .replace(/<canvas\b[^<]*>([\s\S]*?)<\/canvas>/gi, ' ')
      .replace(/<header\b[^<]*>([\s\S]*?)<\/header>/gi, ' ')
      .replace(/<footer\b[^<]*>([\s\S]*?)<\/footer>/gi, ' ')
      .replace(/<nav\b[^<]*>([\s\S]*?)<\/nav>/gi, ' ');

    // 3. Replace block tag closing boundaries with spaces BEFORE stripping tags
    cleaned = cleaned
      .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|td|article|section|header|footer|nav|span)>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ');

    // 4. Remove all HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, ' ');

    // 5. Remove JSON blocks, JS code, CSS variables, Google Analytics / GTM / Base64 / URL strings
    cleaned = cleaned
      .replace(/\{[^{}]*\}/g, ' ')
      .replace(/function\s*\([^)]*\)\s*\{[^}]*\}/gi, ' ')
      .replace(/(var|const|let)\s+[a-zA-Z0-9_$]+\s*=/gi, ' ')
      .replace(/window\.[a-zA-Z0-9_$.]+/gi, ' ')
      .replace(/document\.[a-zA-Z0-9_$.]+/gi, ' ')
      .replace(/https?:\/\/[^\s]+/gi, ' ')
      .replace(/data:image\/[a-zA-Z]+;base64,[^\s]+/gi, ' ')
      .replace(/@media[^{]+\{([^}]*)\}/gi, ' ');

    // 6. Split camelCase glued words (e.g. "ServicesWe" -> "Services We", "ContactUs" -> "Contact Us")
    cleaned = cleaned
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([a-zA-Z])(\d)/g, '$1 $2')
      .replace(/(\d)([a-zA-Z])/g, '$1 $2');

    // 7. Strip literal \n, \r, \t, \\n, \\r, \\t, control chars, and escaped slashes
    cleaned = cleaned
      .replace(/\\n/gi, ' ')
      .replace(/\\r/gi, ' ')
      .replace(/\\t/gi, ' ')
      .replace(/[\r\n\t\f\v]+/g, ' ')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');

    // 6. Split into sentences and keep ONLY readable human sentences (having actual words)
    const sentences = cleaned.split(/(?<=[.!?])\s+/);
    const validSentences = sentences.filter(s => {
      const trimmed = s.trim();
      if (trimmed.length < 15) return false;
      if (/^[0-9\s\W]+$/.test(trimmed)) return false; // Ignore pure numbers or symbols
      if (/^\.[\w-]+/.test(trimmed)) return false; // Ignore CSS class definitions
      if (trimmed.toLowerCase().includes('cookie') || trimmed.toLowerCase().includes('privacy policy') || trimmed.toLowerCase().includes('all rights reserved')) return false;
      const wordCount = trimmed.split(/\s+/).length;
      return wordCount >= 3;
    });

    let resultText = validSentences.join(' ');
    resultText = resultText.replace(/\s+/g, ' ').trim();

    if (resultText.length < 20) return 'N/A';
    return resultText;
  }

  function extractSectionFromText(fullText, keywords) {
    if (!fullText || fullText === 'N/A') return 'N/A';
    const sentences = fullText.split(/(?<=[.!?])\s+/);
    const matchedSentences = sentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return keywords.some(kw => lower.includes(kw));
    });

    if (matchedSentences.length > 0) {
      return matchedSentences.join(' ').substring(0, 600);
    }
    return fullText.substring(0, 350);
  }

  function extractPageData(html, baseUrl) {
    if (!html) return { text: 'N/A', phones: [], emails: [], socials: {}, subPages: {}, keywords: [] };

    const decodedHtml = decodeHtmlEntities(html);
    const parser = new DOMParser();
    const doc = parser.parseFromString(decodedHtml, 'text/html');

    doc.querySelectorAll('script, style, noscript, iframe, svg, canvas').forEach(el => el.remove());

    const title = doc.querySelector('title')?.textContent?.trim() || '';
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '';

    // Collect complete body text with proper paragraph spaces
    const textBlocks = [];
    if (doc.body) {
      const bodyClone = doc.body.cloneNode(true);
      bodyClone.querySelectorAll('script, style, noscript, iframe, svg, canvas, header, footer, nav, button, form').forEach(el => el.remove());

      bodyClone.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, article, section, td').forEach(el => {
        const txt = el.textContent ? el.textContent.trim() : '';
        if (txt.length >= 15 && !txt.includes('{') && !txt.includes('function(')) {
          if (!textBlocks.includes(txt)) {
            textBlocks.push(txt);
          }
        }
      });
    }

    let bodyText = textBlocks.join(' ');
    if (!bodyText && doc.body) {
      bodyText = (doc.body.innerText || doc.body.textContent || '').replace(/[\r\n\t]+/g, ' ');
    }

    const rawCombinedText = (title ? `[${title}] ` : '') + (metaDesc ? `(${metaDesc}) ` : '') + bodyText;
    const fullText = cleanAndFormatSectionText(rawCombinedText);

    // ── Emails Extractor
    const emailsFound = new Set();
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
    (decodedHtml.match(emailRegex) || []).forEach(e => {
      const lower = e.toLowerCase();
      if (!/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(lower)) {
        emailsFound.add(lower);
      }
    });

    doc.querySelectorAll('a[href^="mailto:"]').forEach(a => {
      const mail = a.href.replace(/^mailto:/i, '').split('?')[0].trim().toLowerCase();
      if (mail && mail.includes('@')) emailsFound.add(mail);
    });

    const obfRegex = /([a-zA-Z0-9._%+-]+)\s*(\[at\]|\(at\)|@)\s*([a-zA-Z0-9.-]+)\s*(\[dot\]|\(dot\)|\.)\s*([a-zA-Z]{2,})/gi;
    let match;
    while ((match = obfRegex.exec(decodedHtml)) !== null) {
      const cleanEmail = `${match[1]}@${match[3]}.${match[5]}`.toLowerCase();
      emailsFound.add(cleanEmail);
    }

    // ── Phones Extractor
    const phonesFound = new Set();
    doc.querySelectorAll('a[href^="tel:"]').forEach(a => {
      const p = a.href.replace(/^tel:/i, '').trim();
      if (p.length >= 7) phonesFound.add(p);
    });

    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
    (decodedHtml.match(phoneRegex) || []).forEach(p => {
      const cleanP = p.trim();
      if (cleanP.length >= 7 && cleanP.length <= 18 && !/^\d{4}$/.test(cleanP) && !/\d+x\d+/i.test(cleanP)) {
        phonesFound.add(cleanP);
      }
    });

    // ── Social Media Links
    const socials = {};
    doc.querySelectorAll('a[href]').forEach(a => {
      const href = a.href;
      if (!href) return;
      const lower = href.toLowerCase();
      if (lower.includes('facebook.com/')) socials['Facebook'] = href;
      else if (lower.includes('twitter.com/') || lower.includes('x.com/')) socials['Twitter'] = href;
      else if (lower.includes('linkedin.com/')) socials['LinkedIn'] = href;
      else if (lower.includes('instagram.com/')) socials['Instagram'] = href;
      else if (lower.includes('youtube.com/')) socials['YouTube'] = href;
      else if (lower.includes('github.com/')) socials['GitHub'] = href;
      else if (lower.includes('tiktok.com/')) socials['TikTok'] = href;
      else if (lower.includes('whatsapp.com/') || lower.includes('wa.me/')) socials['WhatsApp'] = href;
    });

    // ── Custom Keywords
    const keywordsFound = [];
    const customKeywords = DOM.customKeywordsInput ? DOM.customKeywordsInput.value.trim() : '';
    if (customKeywords && fullText) {
      const kwList = customKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0);
      kwList.forEach(kw => {
        const regex = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (regex.test(fullText)) keywordsFound.push(kw);
      });
    }

    // ── Sub-pages Discovery (Multi-pattern matcher)
    const subPages = {};
    doc.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const text = (a.textContent || '').toLowerCase().trim();
      const lowerHref = href.toLowerCase().trim();

      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

      // About Us detection
      if (DOM.chkAbout && DOM.chkAbout.checked && !subPages['About Us'] && (
        text.includes('about') || text.includes('who we are') || text.includes('company') || text.includes('our story') ||
        lowerHref.includes('/about') || lowerHref.includes('about-us') || lowerHref.includes('who-we-are') || lowerHref.includes('our-story')
      )) {
        try { subPages['About Us'] = new URL(href, baseUrl).href; } catch (_) {}
      }

      // Contact Us detection
      if (DOM.chkContact && DOM.chkContact.checked && !subPages['Contact Us'] && (
        text.includes('contact') || text.includes('reach us') || text.includes('get in touch') || text.includes('location') ||
        lowerHref.includes('/contact') || lowerHref.includes('contact-us') || lowerHref.includes('reach-us') || lowerHref.includes('get-in-touch')
      )) {
        try { subPages['Contact Us'] = new URL(href, baseUrl).href; } catch (_) {}
      }

      // Services detection
      if (DOM.chkServices && DOM.chkServices.checked && !subPages['Services'] && (
        text.includes('service') || text.includes('what we do') || text.includes('solutions') || text.includes('offerings') ||
        lowerHref.includes('/service') || lowerHref.includes('our-services') || lowerHref.includes('what-we-do') || lowerHref.includes('/solutions')
      )) {
        try { subPages['Services'] = new URL(href, baseUrl).href; } catch (_) {}
      }
    });

    return {
      text: fullText || 'N/A',
      phones: Array.from(phonesFound).slice(0, 5),
      emails: Array.from(emailsFound).slice(0, 5),
      socials,
      keywords: keywordsFound,
      subPages
    };
  }

  // ─── Parallel Worker Automation Engine ───────────────────────────────────
  function setToolbarState(mode) {
    const hasErrors = state.tasks.some(t => t.status === 'error');

    if (mode === 'running') {
      if (DOM.btnPause) DOM.btnPause.classList.remove('hidden');
      if (DOM.btnResume) DOM.btnResume.classList.add('hidden');
      if (DOM.btnStop) DOM.btnStop.classList.remove('hidden');
      if (DOM.btnRestart) DOM.btnRestart.classList.add('hidden');
      if (DOM.btnRetryFailed) DOM.btnRetryFailed.classList.add('hidden');
    } else if (mode === 'paused') {
      if (DOM.btnPause) DOM.btnPause.classList.add('hidden');
      if (DOM.btnResume) DOM.btnResume.classList.remove('hidden');
      if (DOM.btnStop) DOM.btnStop.classList.remove('hidden');
      if (DOM.btnRestart) DOM.btnRestart.classList.add('hidden');
      if (DOM.btnRetryFailed) DOM.btnRetryFailed.classList.add('hidden');
    } else { // completed, stopped, idle
      if (DOM.btnPause) DOM.btnPause.classList.add('hidden');
      if (DOM.btnResume) DOM.btnResume.classList.add('hidden');
      if (DOM.btnStop) DOM.btnStop.classList.add('hidden');
      if (DOM.btnRestart) DOM.btnRestart.classList.remove('hidden');
      if (DOM.btnRetryFailed) {
        if (hasErrors) DOM.btnRetryFailed.classList.remove('hidden');
        else DOM.btnRetryFailed.classList.add('hidden');
      }
    }
  }

  function setupControls() {
    if (DOM.btnStartMining) DOM.btnStartMining.addEventListener('click', startMiningSession);
    if (DOM.btnPause) DOM.btnPause.addEventListener('click', pauseMining);
    if (DOM.btnResume) DOM.btnResume.addEventListener('click', resumeMining);
    if (DOM.btnStop) DOM.btnStop.addEventListener('click', stopMining);
    if (DOM.btnRestart) DOM.btnRestart.addEventListener('click', restartMiningSession);
    if (DOM.btnRetryFailed) DOM.btnRetryFailed.addEventListener('click', retryFailedSites);
    if (DOM.btnClearLog) DOM.btnClearLog.addEventListener('click', () => { if (DOM.consoleLog) DOM.consoleLog.innerHTML = ''; });
    if (DOM.btnCleanData) DOM.btnCleanData.addEventListener('click', cleanExtractedData);
    if (DOM.btnClearHistory) DOM.btnClearHistory.addEventListener('click', clearHistory);
    if (DOM.tableSearch) DOM.tableSearch.addEventListener('input', renderTable);
  }

  function retryFailedSites() {
    const failedTasks = state.tasks.filter(t => t.status === 'error');
    if (failedTasks.length === 0) {
      return alert('No failed websites to retry!');
    }

    failedTasks.forEach(t => {
      t.status = 'pending';
      t.homeText = 'Pending...';
      t.error = null;
    });

    state.currentIndex = 0;
    state.isRunning = true;
    state.isPaused = false;

    if (DOM.sessionStatusBadge) {
      DOM.sessionStatusBadge.textContent = 'Mining Active (Retry)';
      DOM.sessionStatusBadge.className = 'badge badge-running';
    }

    setToolbarState('running');
    updateUI();
    addLog(`🔄 Retrying ${failedTasks.length} failed websites...`, 'system');

    for (let i = 0; i < state.concurrency; i++) {
      spawnWorker();
    }
  }

  function startMiningSession() {
    parseInputURLs();
    if (state.urls.length === 0) {
      alert('No valid website URLs found! Please enter valid domain links (e.g. example.com or https://site.org).');
      return;
    }

    state.tasks = state.urls.map(u => ({
      url: u.url,
      original: u.original,
      domain: u.domain,
      status: u.isDuplicate ? 'skipped' : 'pending',
      phones: [],
      emails: [],
      socials: {},
      keywords: [],
      homeText: u.isDuplicate ? 'Duplicate URL Skipped' : 'Pending...',
      aboutText: 'N/A',
      contactText: 'N/A',
      servicesText: 'N/A',
      error: u.isDuplicate ? 'Duplicate Skipped' : null
    }));

    state.currentIndex = 0;
    state.activeWorkers = 0;
    state.isRunning = true;
    state.isPaused = false;
    state.startTime = new Date();

    if (DOM.navBtns[1]) DOM.navBtns[1].click();
    if (DOM.sessionStatusBadge) {
      DOM.sessionStatusBadge.textContent = 'Mining Active';
      DOM.sessionStatusBadge.className = 'badge badge-running';
    }

    setToolbarState('running');
    startTimer();
    updateUI();
    addLog(`🚀 Mining started for ${state.tasks.length} validated websites (${state.concurrency} Parallel Workers)`, 'system');

    // Launch worker pool
    for (let i = 0; i < state.concurrency; i++) {
      spawnWorker();
    }
  }

  function restartMiningSession() {
    if (state.urls.length > 0) {
      startMiningSession();
    } else {
      if (DOM.navBtns[0]) DOM.navBtns[0].click();
    }
  }

  async function spawnWorker() {
    if (!state.isRunning || state.isPaused) return;

    if (state.currentIndex >= state.tasks.length) {
      if (state.activeWorkers === 0) finishMiningSession();
      return;
    }

    const taskIndex = state.currentIndex++;
    const task = state.tasks[taskIndex];

    if (task.status === 'skipped') {
      updateUI();
      spawnWorker();
      return;
    }

    state.activeWorkers++;
    task.status = 'processing';
    updateStepPipeline(2);
    addLog(`🌐 [${taskIndex + 1}/${state.tasks.length}] Mining ${task.url}...`);
    updateUI();

    try {
      const html = await fetchWithParallelProxies(task.url, 7000);

      if (html) {
        updateStepPipeline(3);
        const extracted = extractPageData(html, task.url);

        if (DOM.chkHome && DOM.chkHome.checked) task.homeText = extracted.text;
        if (DOM.chkPhone && DOM.chkPhone.checked) task.phones = extracted.phones;
        if (DOM.chkEmail && DOM.chkEmail.checked) task.emails = extracted.emails;
        if (DOM.chkSocial && DOM.chkSocial.checked) task.socials = extracted.socials;
        task.keywords = extracted.keywords;

        // Parallel Sub-pages Crawler
        const subPagePromises = Object.entries(extracted.subPages).map(async ([type, subUrl]) => {
          const subHtml = await fetchWithParallelProxies(subUrl, 7000);
          if (subHtml) {
            const subExtracted = extractPageData(subHtml, subUrl);
            if (type === 'About Us' && DOM.chkAbout && DOM.chkAbout.checked) task.aboutText = subExtracted.text;
            if (type === 'Contact Us' && DOM.chkContact && DOM.chkContact.checked) task.contactText = subExtracted.text;
            if (type === 'Services' && DOM.chkServices && DOM.chkServices.checked) task.servicesText = subExtracted.text;

            if (DOM.chkPhone && DOM.chkPhone.checked) task.phones = Array.from(new Set([...task.phones, ...subExtracted.phones]));
            if (DOM.chkEmail && DOM.chkEmail.checked) task.emails = Array.from(new Set([...task.emails, ...subExtracted.emails]));
          }
        });

        await Promise.all(subPagePromises);

        // Smart Fallback Section Extraction if dedicated sub-pages are N/A
        if (task.homeText && task.homeText !== 'N/A') {
          if ((!task.aboutText || task.aboutText === 'N/A') && DOM.chkAbout && DOM.chkAbout.checked) {
            task.aboutText = extractSectionFromText(task.homeText, ['about', 'who we are', 'our story', 'company', 'mission', 'about us']);
          }
          if ((!task.contactText || task.contactText === 'N/A') && DOM.chkContact && DOM.chkContact.checked) {
            task.contactText = extractSectionFromText(task.homeText, ['contact', 'address', 'reach us', 'get in touch', 'phone', 'email', 'location', 'contact us']);
          }
          if ((!task.servicesText || task.servicesText === 'N/A') && DOM.chkServices && DOM.chkServices.checked) {
            task.servicesText = extractSectionFromText(task.homeText, ['service', 'what we do', 'solutions', 'offerings', 'features', 'our services']);
          }
        }

        const hasValidData = (task.phones && task.phones.length > 0) ||
                             (task.emails && task.emails.length > 0) ||
                             (task.socials && Object.keys(task.socials).length > 0) ||
                             (task.homeText && task.homeText !== 'N/A' && task.homeText !== 'Not Found' && task.homeText !== 'Pending...' && task.homeText.length > 20);

        if (hasValidData) {
          task.status = 'done';
          addLog(`✅ Extracted data from ${task.url} (Emails: ${task.emails.length}, Phones: ${task.phones.length})`, 'success');
        } else {
          task.status = 'error';
          task.error = 'Site Unreachable / No Data Found';
          if (!task.homeText || task.homeText === 'Pending...') task.homeText = 'Site Unreachable / No Data Found';
          addLog(`⚠️ No data found on ${task.url} (Counted under Failed/Error)`, 'error');
        }
      } else {
        task.status = 'error';
        task.error = 'Site Unreachable / Fetch Failed';
        task.homeText = 'Site Unreachable / Fetch Failed';
        addLog(`❌ Could not fetch ${task.url} (Counted under Failed/Error)`, 'error');
      }
    } catch (err) {
      task.status = 'error';
      task.error = err.message || 'Fetch Error';
      task.homeText = `Error: ${err.message || 'Fetch Error'}`;
      addLog(`❌ Error mining ${task.url}: ${err.message}`, 'error');
    } finally {
      state.activeWorkers--;
      updateStepPipeline(5);
      updateUI();
      spawnWorker();
    }
  }

  function finishMiningSession() {
    state.isRunning = false;
    stopTimer();

    if (DOM.sessionStatusBadge) {
      DOM.sessionStatusBadge.textContent = 'Completed';
      DOM.sessionStatusBadge.className = 'badge badge-idle';
    }

    setToolbarState('completed');
    addLog(`🎉 Session complete! Processed ${state.tasks.length} valid sites in ${DOM.lblElapsedTime ? DOM.lblElapsedTime.textContent : '0s'}`, 'system');
    playCompletionChime();
    saveSessionToHistory();
  }

  function pauseMining() {
    state.isPaused = true;
    if (DOM.sessionStatusBadge) {
      DOM.sessionStatusBadge.textContent = 'Paused';
      DOM.sessionStatusBadge.className = 'badge badge-paused';
    }
    setToolbarState('paused');
    addLog('⏸️ Session paused', 'system');
  }

  function resumeMining() {
    state.isPaused = false;
    if (DOM.sessionStatusBadge) {
      DOM.sessionStatusBadge.textContent = 'Mining Active';
      DOM.sessionStatusBadge.className = 'badge badge-running';
    }
    setToolbarState('running');
    addLog('▶️ Session resumed', 'system');

    const needed = state.concurrency - state.activeWorkers;
    for (let i = 0; i < needed; i++) spawnWorker();
  }

  function stopMining() {
    state.isRunning = false;
    stopTimer();
    if (DOM.sessionStatusBadge) {
      DOM.sessionStatusBadge.textContent = 'Stopped';
      DOM.sessionStatusBadge.className = 'badge badge-idle';
    }
    setToolbarState('stopped');
    addLog('🛑 Session stopped by user', 'error');
  }

  // ─── Audio Chime Synthesizer ─────────────────────────────────────────────
  function playCompletionChime() {
    if (!DOM.chkSound || !DOM.chkSound.checked) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.3);
      });
    } catch (_) { }
  }

  // ─── Data Sanitizer ──────────────────────────────────────────────────────
  function cleanExtractedData() {
    let count = 0;
    state.tasks.forEach(t => {
      if (t.homeText) { t.homeText = cleanAndFormatSectionText(t.homeText); count++; }
      if (t.aboutText) { t.aboutText = cleanAndFormatSectionText(t.aboutText); count++; }
      if (t.contactText) { t.contactText = cleanAndFormatSectionText(t.contactText); count++; }
      if (t.servicesText) { t.servicesText = cleanAndFormatSectionText(t.servicesText); count++; }
    });
    updateUI();
    alert(`Cleaned ${count} text fields! Removed HTML tags and excess whitespace.`);
  }

  // ─── Dynamic Export Data Builder ─────────────────────────────────────────
  function buildExportData() {
    return state.tasks.map(t => {
      const row = {
        'Website URL': t.url,
        'Status': t.status
      };

      if (DOM.chkPhone && DOM.chkPhone.checked) {
        row['Phone Numbers'] = t.phones.length ? t.phones.join(' | ') : 'N/A';
      }
      if (DOM.chkEmail && DOM.chkEmail.checked) {
        row['Email Addresses'] = t.emails.length ? t.emails.join(' | ') : 'N/A';
      }
      if (DOM.chkSocial && DOM.chkSocial.checked) {
        row['Social Links'] = Object.entries(t.socials).map(([k, v]) => `${k}: ${v}`).join(' | ') || 'N/A';
      }
      if (DOM.customKeywordsInput && DOM.customKeywordsInput.value.trim()) {
        row['Custom Keywords'] = (t.keywords && t.keywords.length) ? t.keywords.join(' | ') : 'None';
      }
      if (DOM.chkHome && DOM.chkHome.checked) {
        row['Homepage Content'] = cleanAndFormatSectionText(t.homeText);
      }
      if (DOM.chkAbout && DOM.chkAbout.checked) {
        row['About Us Content'] = cleanAndFormatSectionText(t.aboutText);
      }
      if (DOM.chkContact && DOM.chkContact.checked) {
        row['Contact Us Content'] = cleanAndFormatSectionText(t.contactText);
      }
      if (DOM.chkServices && DOM.chkServices.checked) {
        row['Services Content'] = cleanAndFormatSectionText(t.servicesText);
      }

      return row;
    });
  }

  // ─── UI & Table Renderer ─────────────────────────────────────────────────
  function updateUI() {
    const total = state.tasks.length;
    const done = state.tasks.filter(t => t.status === 'done').length;
    const error = state.tasks.filter(t => t.status === 'error').length;
    const skipped = state.tasks.filter(t => t.status === 'skipped').length;
    const processed = done + error + skipped;
    const pct = total === 0 ? 0 : ((processed / total) * 100).toFixed(1);

    if (DOM.lblProcessed) DOM.lblProcessed.textContent = processed;
    if (DOM.lblTotal) DOM.lblTotal.textContent = total;
    if (DOM.lblPercentage) DOM.lblPercentage.textContent = `${pct}%`;
    if (DOM.progressBarFill) DOM.progressBarFill.style.width = `${pct}%`;

    if (DOM.statTotal) DOM.statTotal.textContent = total;
    if (DOM.statDone) DOM.statDone.textContent = done;
    if (DOM.statError) DOM.statError.textContent = error;
    if (DOM.statSkipped) DOM.statSkipped.textContent = skipped;

    const quickStatus = document.getElementById('quick-status');
    const lblStatusText = document.getElementById('lbl-status-text');
    if (quickStatus && lblStatusText) {
      if (state.isRunning && processed < total) {
        quickStatus.classList.remove('hidden');
        lblStatusText.textContent = `Mining: ${processed} / ${total} websites (${pct}%)`;
      } else if (!state.isRunning && processed > 0) {
        quickStatus.classList.remove('hidden');
        lblStatusText.textContent = `🎉 Completed ${done} / ${total} websites!`;
      }
    }

    renderTable();
    updateChart(done, error, skipped, total - processed);
  }

  function updateStepPipeline(activeStepIndex) {
    const items = document.querySelectorAll('.pipeline-item');
    items.forEach((item, idx) => {
      item.classList.remove('active', 'done');
      if (idx < activeStepIndex) item.classList.add('done');
      else if (idx === activeStepIndex) item.classList.add('active');
    });
  }

  function renderTable() {
    if (!DOM.tableBody) return;
    if (state.tasks.length === 0) {
      DOM.tableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">No mined data yet. Click "Launch Mining Session" on Home tab.</td></tr>`;
      return;
    }

    const searchTerm = (DOM.tableSearch ? DOM.tableSearch.value : '').toLowerCase().trim();
    const filtered = state.tasks.filter(t => {
      if (!searchTerm) return true;
      return (
        t.url.toLowerCase().includes(searchTerm) ||
        t.status.toLowerCase().includes(searchTerm) ||
        t.phones.some(p => p.toLowerCase().includes(searchTerm)) ||
        t.emails.some(e => e.toLowerCase().includes(searchTerm)) ||
        Object.keys(t.socials).some(s => s.toLowerCase().includes(searchTerm)) ||
        (t.homeText && t.homeText.toLowerCase().includes(searchTerm)) ||
        (t.aboutText && t.aboutText.toLowerCase().includes(searchTerm))
      );
    });

    if (filtered.length === 0) {
      DOM.tableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted">No matching results found for "${escapeHtml(searchTerm)}".</td></tr>`;
      return;
    }

    DOM.tableBody.innerHTML = filtered.map((t, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${t.url}</strong></td>
        <td><span class="badge badge-${t.status}">${t.status === 'skipped' ? 'SKIPPED (Duplicate)' : t.status.toUpperCase()}</span></td>
        <td>${t.phones.length ? t.phones.join(', ') : '<span class="text-muted">N/A</span>'}</td>
        <td>${t.emails.length ? t.emails.join(', ') : '<span class="text-muted">N/A</span>'}</td>
        <td>${Object.keys(t.socials).length ? Object.keys(t.socials).join(', ') : '<span class="text-muted">N/A</span>'}</td>
        <td>${t.keywords && t.keywords.length ? `<span class="badge badge-idle" style="background: rgba(108, 99, 255, 0.2); color: var(--color-primary); border: 1px solid rgba(108, 99, 255, 0.4);">${t.keywords.join(', ')}</span>` : '<span class="text-muted">None</span>'}</td>
        <td>${truncate(t.homeText, 35)}</td>
        <td>${truncate(t.aboutText, 35)}</td>
        <td>${truncate(t.contactText, 35)}</td>
        <td><button class="btn btn-secondary btn-xs btn-view-detail" data-url="${escapeHtml(t.url)}">Details</button></td>
      </tr>
    `).join('');

    document.querySelectorAll('.btn-view-detail').forEach(b => {
      b.addEventListener('click', () => {
        const targetUrl = b.getAttribute('data-url');
        const found = state.tasks.find(t => t.url === targetUrl);
        if (found) showTaskDetails(found);
      });
    });
  }

  function truncate(str, max) {
    if (!str || str === 'N/A' || str === 'Not Found' || str === 'Pending...') return '<span class="text-muted">N/A</span>';
    return str.length > max ? str.substring(0, max) + '...' : str;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showTaskDetails(task) {
    if (!DOM.detailModalTitle || !DOM.detailModalBody || !DOM.modalDetail) return;
    DOM.detailModalTitle.textContent = task.url;
    DOM.detailModalBody.innerHTML = `
      <div class="margin-top-sm">
        <h4>Phone Numbers:</h4> <p>${escapeHtml(task.phones.join(', ')) || 'N/A'}</p>
        <h4 class="margin-top-sm">Email Addresses:</h4> <p>${escapeHtml(task.emails.join(', ')) || 'N/A'}</p>
        <h4 class="margin-top-sm">Social Media Links:</h4> <p>${Object.entries(task.socials).map(([k, v]) => `<strong>${escapeHtml(k)}:</strong> <a href="${escapeHtml(v)}" target="_blank" style="color: var(--color-accent);">${escapeHtml(v)}</a>`).join('<br>') || 'N/A'}</p>
        <h4 class="margin-top-sm">Custom Keywords Found:</h4> <p>${task.keywords && task.keywords.length ? escapeHtml(task.keywords.join(', ')) : 'None'}</p>
        <h4 class="margin-top-md">Homepage Content:</h4>
        <div class="console-box" style="height: 100px;">${escapeHtml(cleanAndFormatSectionText(task.homeText))}</div>
        <h4 class="margin-top-md">About Us Content:</h4>
        <div class="console-box" style="height: 100px;">${escapeHtml(cleanAndFormatSectionText(task.aboutText))}</div>
        <h4 class="margin-top-md">Contact Us Content:</h4>
        <div class="console-box" style="height: 100px;">${escapeHtml(cleanAndFormatSectionText(task.contactText))}</div>
        <h4 class="margin-top-md">Services Content:</h4>
        <div class="console-box" style="height: 100px;">${escapeHtml(cleanAndFormatSectionText(task.servicesText))}</div>
      </div>
    `;
    DOM.modalDetail.classList.remove('hidden');
  }

  function addLog(msg, type = 'normal') {
    if (!DOM.consoleLog) return;
    const time = new Date().toLocaleTimeString();
    const div = document.createElement('div');
    div.className = `log-line ${type}`;
    div.textContent = `[${time}] ${msg}`;
    DOM.consoleLog.appendChild(div);
    DOM.consoleLog.scrollTop = DOM.consoleLog.scrollHeight;
  }

  // ─── Chart.js Integration ────────────────────────────────────────────────
  function initChart() {
    const canvas = document.getElementById('status-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const textColor = state.theme === 'dark' ? '#9E9EB3' : '#4A4A68';

    state.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Successful', 'Failed/Error', 'Skipped', 'Pending'],
        datasets: [{
          data: [0, 0, 0, 0],
          backgroundColor: ['#00C853', '#FF6B6B', '#FFB347', 'rgba(255,255,255,0.1)'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'right', labels: { color: textColor, font: { family: 'Inter', size: 11 } } } }
      }
    });
  }

  function updateChart(done, error, skipped, pending) {
    if (!state.chart) return;
    state.chart.data.datasets[0].data = [done, error, skipped, Math.max(0, pending)];
    state.chart.update();
  }

  // ─── Timer ───────────────────────────────────────────────────────────────
  function startTimer() {
    stopTimer();
    state.timerInterval = setInterval(() => {
      const elapsed = new Date() - state.startTime;
      if (DOM.lblElapsedTime) DOM.lblElapsedTime.textContent = formatDuration(elapsed);
    }, 1000);
  }

  function stopTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
  }

  function formatDuration(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  function closeModalDetail() {
    if (DOM.modalDetail) DOM.modalDetail.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function closeModalExport() {
    if (DOM.modalExport) DOM.modalExport.classList.add('hidden');
    document.body.style.overflow = '';
  }

  // ─── Exporters & Modals ──────────────────────────────────────────────────
  function setupExporters() {
    if (DOM.btnExportToolbar) {
      DOM.btnExportToolbar.addEventListener('click', () => {
        if (DOM.modalExport) {
          DOM.modalExport.classList.remove('hidden');
          document.body.style.overflow = 'hidden';
        }
      });
    }
    if (DOM.btnCloseExport) DOM.btnCloseExport.addEventListener('click', closeModalExport);
    if (DOM.btnCloseDetail) DOM.btnCloseDetail.addEventListener('click', closeModalDetail);
    if (DOM.btnBackDetail) DOM.btnBackDetail.addEventListener('click', closeModalDetail);

    // Backdrop click handlers
    if (DOM.modalExport) {
      DOM.modalExport.addEventListener('click', (e) => {
        if (e.target === DOM.modalExport) closeModalExport();
      });
    }
    if (DOM.modalDetail) {
      DOM.modalDetail.addEventListener('click', (e) => {
        if (e.target === DOM.modalDetail) closeModalDetail();
      });
    }

    // Escape key handler
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModalExport();
        closeModalDetail();
      }
    });

    if (DOM.exportExcel) DOM.exportExcel.addEventListener('click', exportToExcel);
    if (DOM.exportCsv) DOM.exportCsv.addEventListener('click', exportToCSV);
    if (DOM.exportPdf) DOM.exportPdf.addEventListener('click', exportToPDF);
    if (DOM.exportJson) DOM.exportJson.addEventListener('click', exportToJSON);
    if (DOM.exportTxt) DOM.exportTxt.addEventListener('click', exportToTXT);
  }

  function buildExportData() {
    return state.tasks.map((t, idx) => {
      const row = {
        'SL': idx + 1,
        'Website URL': t.url,
        'Status': t.status === 'skipped' ? 'SKIPPED (Duplicate)' : t.status.toUpperCase()
      };

      if (DOM.chkPhone && DOM.chkPhone.checked) {
        row['Phone Numbers'] = (t.phones && t.phones.length) ? t.phones.join(' | ') : 'N/A';
      }
      if (DOM.chkEmail && DOM.chkEmail.checked) {
        row['Email Addresses'] = (t.emails && t.emails.length) ? t.emails.join(' | ') : 'N/A';
      }
      if (DOM.chkSocial && DOM.chkSocial.checked) {
        row['Social Media Links'] = (t.socials && Object.keys(t.socials).length)
          ? Object.entries(t.socials).map(([k, v]) => `${k}: ${v}`).join(' | ')
          : 'N/A';
      }
      if (DOM.customKeywordsInput && DOM.customKeywordsInput.value.trim()) {
        row['Custom Keywords Found'] = (t.keywords && t.keywords.length) ? t.keywords.join(' | ') : 'None';
      }
      if (DOM.chkHome && DOM.chkHome.checked) {
        row['Homepage Content'] = cleanAndFormatSectionText(t.homeText);
      }
      if (DOM.chkAbout && DOM.chkAbout.checked) {
        row['About Us Content'] = cleanAndFormatSectionText(t.aboutText);
      }
      if (DOM.chkContact && DOM.chkContact.checked) {
        row['Contact Us Content'] = cleanAndFormatSectionText(t.contactText);
      }
      if (DOM.chkServices && DOM.chkServices.checked) {
        row['Services Content'] = cleanAndFormatSectionText(t.servicesText);
      }

      return row;
    });
  }

  function exportToExcel() {
    if (state.tasks.length === 0) return alert('No data to export!');
    const data = buildExportData();

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mined Data');
    XLSX.writeFile(workbook, `Website_Data_Mined_${Date.now()}.xlsx`);
    if (DOM.modalExport) DOM.modalExport.classList.add('hidden');
  }

  function exportToCSV() {
    if (state.tasks.length === 0) return alert('No data to export!');
    const data = buildExportData();
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`));

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, `Website_Data_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
    if (DOM.modalExport) DOM.modalExport.classList.add('hidden');
  }

  function exportToPDF() {
    if (state.tasks.length === 0) return alert('No data to export!');
    if (!window.jspdf || !window.jspdf.jsPDF) {
      return alert('PDF export library is loading, please try again in a moment.');
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');

    doc.text('Website Data Mining Report', 14, 15);
    doc.text(`Total Sites: ${state.tasks.length}`, 14, 22);

    const data = buildExportData();
    if (!data.length) return;

    const headers = [Object.keys(data[0])];
    const body = data.map(row => Object.values(row).map(v => String(v).substring(0, 80)));

    doc.autoTable({ head: headers, body: body, startY: 28, styles: { fontSize: 7 } });
    doc.save(`Website_Data_Report_${Date.now()}.pdf`);
    if (DOM.modalExport) DOM.modalExport.classList.add('hidden');
  }

  function exportToJSON() {
    if (state.tasks.length === 0) return alert('No data to export!');
    const data = buildExportData();
    downloadFile(JSON.stringify(data, null, 2), `Website_Data_${Date.now()}.json`, 'application/json');
    if (DOM.modalExport) DOM.modalExport.classList.add('hidden');
  }

  function exportToTXT() {
    if (state.tasks.length === 0) return alert('No data to export!');
    const data = buildExportData();
    if (!data.length) return;

    const headers = Object.keys(data[0]).join('\t');
    const rows = data.map(row => Object.values(row).map(v => String(v).replace(/[\r\n\t]+/g, ' ')).join('\t'));

    downloadFile([headers, ...rows].join('\n'), `Website_Data_${Date.now()}.txt`, 'text/plain');
    if (DOM.modalExport) DOM.modalExport.classList.add('hidden');
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }

  // ─── LocalStorage Session History ─────────────────────────────────────────
  function saveSessionToHistory() {
    const sessionRecord = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      total: state.tasks.length,
      done: state.tasks.filter(t => t.status === 'done').length,
      error: state.tasks.filter(t => t.status === 'error').length,
      skipped: state.tasks.filter(t => t.status === 'skipped').length,
      tasks: state.tasks
    };

    state.history.unshift(sessionRecord);
    try {
      localStorage.setItem('data_miner_history', JSON.stringify(state.history));
    } catch (_) { }
    renderHistory();
  }

  function loadHistoryFromStorage() {
    const raw = localStorage.getItem('data_miner_history');
    if (raw) {
      try {
        state.history = JSON.parse(raw);
        renderHistory();
      } catch (_) { }
    }
  }

  function renderHistory() {
    if (!DOM.historyTableBody) return;
    if (state.history.length === 0) {
      DOM.historyTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No saved history sessions found.</td></tr>`;
      return;
    }

    DOM.historyTableBody.innerHTML = state.history.map(s => `
      <tr>
        <td><strong>${s.date}</strong></td>
        <td>${s.total}</td>
        <td><span class="color-success">${s.done}</span></td>
        <td><span class="color-danger">${s.error}</span></td>
        <td><span class="color-warning">${s.skipped}</span></td>
        <td>
          <button class="btn btn-secondary btn-xs btn-reload-session" data-id="${s.id}">Reload</button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.btn-reload-session').forEach(b => {
      b.addEventListener('click', () => {
        const id = parseInt(b.getAttribute('data-id'));
        const found = state.history.find(h => h.id === id);
        if (found) {
          state.tasks = found.tasks;
          updateUI();
          if (DOM.navBtns[1]) DOM.navBtns[1].click();
          alert('Saved session loaded into workspace!');
        }
      });
    });
  }

  function clearHistory() {
    if (confirm('Delete all saved history sessions from storage?')) {
      state.history = [];
      localStorage.removeItem('data_miner_history');
      renderHistory();
    }
  }

  document.addEventListener('DOMContentLoaded', init);

})();
