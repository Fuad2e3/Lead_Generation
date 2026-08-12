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
  // 🔒 Domain Lock Security Guard
  (function verifyDomainAccess() {
    const hostname = (window.location.hostname || '').toLowerCase();

    // ⚙️ Allowed Domains Configuration:
    // - Localhost (localhost, 127.0.0.1) for testing on your local PC
    // - *.github.io for your live site on GitHub Pages
    // - Add any custom domain below if you buy a domain in the future
    const allowedCustomDomains = [
      'fuad2e3.github.io' // Your GitHub Username domain
      // 'yourcustomdomain.com'
    ];

    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
    const isGitHubPages = hostname.endsWith('.github.io');
    const isAllowed = isLocalhost || isGitHubPages || allowedCustomDomains.includes(hostname);

    if (!isAllowed) {
      document.documentElement.innerHTML = `
        <head>
          <title>Access Denied</title>
          <style>
            body { margin: 0; background: #0b0f19; color: #f87171; font-family: sans-serif; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px; }
            .card { background: rgba(30, 41, 59, 0.9); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 16px; padding: 40px; max-width: 480px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
            h1 { font-size: 28px; margin: 0 0 12px 0; color: #ef4444; }
            p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; }
            .domain-badge { display: inline-block; background: rgba(239, 68, 68, 0.1); color: #fca5a5; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-family: monospace; border: 1px solid rgba(239, 68, 68, 0.2); }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>⛔ Access Denied</h1>
            <p>This software is domain-locked and unauthorized for use on this domain. Unauthorized copying or redistribution is strictly prohibited.</p>
            <div class="domain-badge">Domain: ${hostname || 'Unknown Host'}</div>
          </div>
        </body>
      `;
      throw new Error('ACCESS_DENIED: Software execution halted due to domain restriction.');
    }
  })();


  // ─── Global State ────────────────────────────────────────────────────────
  const state = {
    urls: [],
    duplicates: 0,
    tasks: [],
    currentIndex: 0,
    activeWorkers: 0,
    concurrency: 1, // Default: 1 Site at a time (Sequential Clean Mining)
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
    btnStartMining: document.getElementById('btn-restart'),
    btnApplyParameters: document.getElementById('btn-apply-parameters'),

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
    loadMineResultsFromStorage();  // Restore previously mined results from lgs_results
    initAuth();
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
        const conc = parseInt(btn.getAttribute('data-concurrency')) || 1;
        state.concurrency = conc;
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

  function normalizeUrlForDupCheck(str) {
    if (!str) return '';
    let clean = str.trim().toLowerCase();
    clean = clean.replace(/^(https?:\/\/)?(www\.)?/, '');
    clean = clean.replace(/\/+$/, '');
    clean = clean.split('?')[0].split('#')[0];
    return clean;
  }

  function parseInputURLs() {
    if (!DOM.urlTextarea) return;
    const rawText = DOM.urlTextarea.value || '';
    if (!rawText.trim()) {
      state.urls = [];
      state.duplicates = 0;
      if (DOM.detectedCount) DOM.detectedCount.textContent = '0';
      if (DOM.duplicatesWarning) DOM.duplicatesWarning.classList.add('hidden');
      if (DOM.statSkipped) DOM.statSkipped.textContent = '0';
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

      const normKey = normalizeUrlForDupCheck(formatted);
      if (seen.has(normKey)) {
        dupes++;
        validUrls.push({ original: cand, url: formatted, domain: normKey, isDuplicate: true });
      } else {
        seen.add(normKey);
        validUrls.push({ original: cand, url: formatted, domain: normKey, isDuplicate: false });
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

    // Instantly sync DUPLICATES SKIPPED stat card on real-time URL paste/input
    if (DOM.statSkipped) DOM.statSkipped.textContent = dupes;
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

  // ─── 404 & Error Page Detector ──────────────────────────────────────────
  function isErrorPageTemplate(htmlText) {
    if (!htmlText || htmlText.length < 50) return true;
    const lower = htmlText.toLowerCase();

    const errorPatterns = [
      'website builder 404',
      '404 page not found',
      '404 not found',
      '503 service unavailable',
      '429 too many requests',
      'cors proxy error',
      'access denied',
      'domain parking',
      'domain for sale'
    ];

    if (htmlText.length < 4000) {
      const isError = errorPatterns.some(pattern => lower.includes(pattern));
      if (isError) return true;
    }
    return false;
  }

  // ─── Direct Native Fetch & Proxy Fallback Engine ─────────────────────────
  async function fetchDirectNative(targetUrl, timeoutMs = 8000) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(targetUrl, { signal: controller.signal, mode: 'cors' });
      clearTimeout(timerId);
      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 50 && !isErrorPageTemplate(text)) return text;
      }
      throw new Error('Direct fetch failed or returned invalid content');
    } catch (err) {
      clearTimeout(timerId);
      throw err;
    }
  }

  async function fetchSingleProxy(proxyFn, targetUrl, timeoutMs = 10000) {
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

      if (isErrorPageTemplate(text)) {
        throw new Error('404 Error Template Page');
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

  async function fetchWithParallelProxies(targetUrl, timeoutMs = 8000) {
    if (DOM.lblActiveProxy) DOM.lblActiveProxy.textContent = 'Smart Multi-Proxy Racer (Direct + 6 Proxies)';

    const promisesHttps = [
      fetchDirectNative(targetUrl, 5000),
      ...PROXY_LIST.map(fn => fetchSingleProxy(fn, targetUrl, timeoutMs))
    ];

    try {
      const html = await Promise.any(promisesHttps);
      if (html) return html;
    } catch (_) { }

    if (targetUrl.startsWith('https://')) {
      const httpUrl = targetUrl.replace(/^https:\/\//i, 'http://');
      const promisesHttp = [
        fetchDirectNative(httpUrl, 5000),
        ...PROXY_LIST.map(fn => fetchSingleProxy(fn, httpUrl, timeoutMs))
      ];
      try {
        const htmlHttp = await Promise.any(promisesHttp);
        if (htmlHttp) return htmlHttp;
      } catch (_) { }
    }

    return null;
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

    // 2. Strip scripts, styles, svg, iframe, noscript, canvas, nav, header, footer, form, dialog tags AND their contents
    cleaned = cleaned
      .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, ' ')
      .replace(/<style\b[^<]*>([\s\S]*?)<\/style>/gi, ' ')
      .replace(/<noscript\b[^<]*>([\s\S]*?)<\/noscript>/gi, ' ')
      .replace(/<svg\b[^<]*>([\s\S]*?)<\/svg>/gi, ' ')
      .replace(/<iframe\b[^<]*>([\s\S]*?)<\/iframe>/gi, ' ')
      .replace(/<canvas\b[^<]*>([\s\S]*?)<\/canvas>/gi, ' ')
      .replace(/<header\b[^<]*>([\s\S]*?)<\/header>/gi, ' ')
      .replace(/<footer\b[^<]*>([\s\S]*?)<\/footer>/gi, ' ')
      .replace(/<nav\b[^<]*>([\s\S]*?)<\/nav>/gi, ' ')
      .replace(/<form\b[^<]*>([\s\S]*?)<\/form>/gi, ' ')
      .replace(/<dialog\b[^<]*>([\s\S]*?)<\/dialog>/gi, ' ');

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

    // 8. Split into readable text segments and filter out junk/error/duplicate lines
    const rawSegments = cleaned.split(/(?:[.!?]|\n|\r|\|)+/);
    const seenSentences = new Set();
    const validSentences = [];

    const boilerplatePatterns = [
      'cookie', 'privacy policy', 'all rights reserved', 'website builder',
      '404 page not found', 'copyright ©', 'terms of service', 'terms and conditions',
      'skip to content', 'accept cookies', 'toggle navigation', 'sign in', 'login'
    ];

    rawSegments.forEach(s => {
      let trimmed = s.trim().replace(/\s+/g, ' ');
      if (trimmed.length < 12) return;
      if (/^[0-9\s\W]+$/.test(trimmed)) return;
      if (/^\.[\w-]+/.test(trimmed)) return;
      
      const lower = trimmed.toLowerCase();
      if (boilerplatePatterns.some(bp => lower.includes(bp))) return;

      const words = trimmed.split(/\s+/);
      if (words.length < 3) return;

      if (!seenSentences.has(lower)) {
        seenSentences.add(lower);
        validSentences.push(trimmed);
      }
    });

    let resultText = validSentences.join('. ');
    resultText = resultText.replace(/\.\s*\./g, '.').replace(/\s+/g, ' ').trim();

    if (resultText.length < 20) return 'N/A';
    return resultText;
  }

  function extractSectionFromText(fullText, keywords) {
    if (!fullText || fullText === 'N/A') return 'N/A';
    const sentences = fullText.split(/[.!?]+\s+/);
    const matchedSentences = sentences.filter(sentence => {
      const lower = sentence.toLowerCase();
      return keywords.some(kw => lower.includes(kw));
    });

    if (matchedSentences.length > 0) {
      return matchedSentences.join(' ').substring(0, 600);
    }
    return fullText.substring(0, 350);
  }

  function isOptionChecked(id) {
    const el = document.getElementById(id);
    if (!el) return true;
    return el.checked !== false;
  }

  function extractPageData(html, baseUrl) {
    if (!html) return { text: 'N/A', phones: [], emails: [], socials: {}, subPages: {}, keywords: [], aboutTextFromHome: 'N/A', contactTextFromHome: 'N/A', servicesTextFromHome: 'N/A' };

    const decodedHtml = decodeHtmlEntities(html);
    const parser = new DOMParser();
    const doc = parser.parseFromString(decodedHtml, 'text/html');

    // Title & Meta
    const title = doc.querySelector('title') ? doc.querySelector('title').textContent.trim() : '';
    const metaDescEl = doc.querySelector('meta[name="description"]') || doc.querySelector('meta[property="og:description"]');
    const metaDesc = metaDescEl ? metaDescEl.getAttribute('content') || '' : '';

    // Extract text blocks
    const textBlocks = [];
    const mainSelectors = ['main', 'article', '#content', '.content', '#main', '.main', '.container', 'body'];
    let mainContainer = null;
    for (const sel of mainSelectors) {
      const el = doc.querySelector(sel);
      if (el) { mainContainer = el; break; }
    }
    if (!mainContainer) mainContainer = doc.body;

    if (mainContainer) {
      const walker = doc.createTreeWalker(mainContainer, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while (node = walker.nextNode()) {
        const parent = node.parentElement;
        if (parent && ['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'NAV', 'HEADER', 'FOOTER'].includes(parent.tagName)) continue;
        const txt = node.textContent.trim();
        if (txt.length > 15 && !textBlocks.includes(txt)) {
          textBlocks.push(txt);
        }
      }
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

    // ── Custom Keywords Extractor
    const keywordsFoundSet = new Set();
    const customKeywordsInput = document.getElementById('custom-keywords-input');
    const customKeywordsRaw = customKeywordsInput ? customKeywordsInput.value.trim() : '';

    if (customKeywordsRaw) {
      const kwList = customKeywordsRaw.split(/[,;\n\r|]+/).map(k => k.trim()).filter(k => k.length > 0);
      const searchableText = [rawCombinedText, decodedHtml, fullText, title, metaDesc].join(' ');

      kwList.forEach(kw => {
        const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedKw}\\b`, 'gi');
        if (regex.test(searchableText) || searchableText.toLowerCase().includes(kw.toLowerCase())) {
          keywordsFoundSet.add(kw);
        }
      });
    }
    const keywordsFound = Array.from(keywordsFoundSet);

    // Extract section texts directly from homepage text as instant non-empty fallbacks
    const aboutTextFromHome = extractSectionFromText(fullText, ['about', 'who we are', 'company', 'our story', 'background', 'overview', 'mission', 'trust', 'pvt']);
    const contactTextFromHome = extractSectionFromText(fullText, ['contact', 'reach us', 'get in touch', 'location', 'address', 'office', 'helpline', 'phone', 'email', 'jaipur', 'rajasthan']);
    const servicesTextFromHome = extractSectionFromText(fullText, ['service', 'what we do', 'solutions', 'offerings', 'loan', 'finance', 'product', 'features', 'investment']);

    // ── Sub-pages Discovery (Multi-pattern matcher + auto-fallback URL builder)
    const subPages = {};
    doc.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const text = (a.textContent || '').toLowerCase().trim();
      const lowerHref = href.toLowerCase().trim();

      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

      // About Us detection
      if (isOptionChecked('chk-about') && !subPages['About Us'] && (
        text.includes('about') || text.includes('who we are') || text.includes('company') || text.includes('our story') || text.includes('profile') ||
        lowerHref.includes('about') || lowerHref.includes('who-we-are') || lowerHref.includes('our-story')
      )) {
        try { subPages['About Us'] = new URL(href, baseUrl).href; } catch (_) {}
      }

      // Contact Us detection
      if (isOptionChecked('chk-contact') && !subPages['Contact Us'] && (
        text.includes('contact') || text.includes('reach us') || text.includes('get in touch') || text.includes('location') || text.includes('address') ||
        lowerHref.includes('contact') || lowerHref.includes('reach-us') || lowerHref.includes('get-in-touch')
      )) {
        try { subPages['Contact Us'] = new URL(href, baseUrl).href; } catch (_) {}
      }

      // Services detection
      if (isOptionChecked('chk-services') && !subPages['Services'] && (
        text.includes('service') || text.includes('what we do') || text.includes('solutions') || text.includes('offerings') || text.includes('loan') || text.includes('product') ||
        lowerHref.includes('service') || lowerHref.includes('our-services') || lowerHref.includes('what-we-do') || lowerHref.includes('solutions')
      )) {
        try { subPages['Services'] = new URL(href, baseUrl).href; } catch (_) {}
      }
    });

    // Auto-construct standard fallback candidate URLs if explicit links were not found on homepage
    try {
      const baseObj = new URL(baseUrl);
      const origin = baseObj.origin;
      if (isOptionChecked('chk-about') && !subPages['About Us']) subPages['About Us'] = `${origin}/about-us`;
      if (isOptionChecked('chk-contact') && !subPages['Contact Us']) subPages['Contact Us'] = `${origin}/contact-us`;
      if (isOptionChecked('chk-services') && !subPages['Services']) subPages['Services'] = `${origin}/services`;
    } catch (_) {}

    return {
      text: fullText || 'N/A',
      aboutTextFromHome: aboutTextFromHome !== 'N/A' ? aboutTextFromHome : fullText.substring(0, 450),
      contactTextFromHome: contactTextFromHome !== 'N/A' ? contactTextFromHome : fullText.substring(0, 450),
      servicesTextFromHome: servicesTextFromHome !== 'N/A' ? servicesTextFromHome : fullText.substring(0, 450),
      phones: Array.from(phonesFound).slice(0, 5),
      emails: Array.from(emailsFound).slice(0, 5),
      socials,
      keywords: keywordsFound,
      subPages
    };
  }

  function isTaskNeedingRetry(t) {
    if (t.status === 'skipped' || t.isDuplicate || t.error === 'Duplicate Skipped' || (t.homeText && t.homeText.includes('Duplicate'))) {
      return false;
    }

    if (t.status === 'error' || t.status === 'pending' || t.error) {
      return true;
    }

    const hasData = (t.phones && t.phones.length > 0) ||
                    (t.emails && t.emails.length > 0) ||
                    (t.homeText && t.homeText !== 'N/A' && !t.homeText.includes('Site Unreachable') && !t.homeText.includes('Pending')) ||
                    (t.aboutText && t.aboutText !== 'N/A' && !t.aboutText.includes('Site Unreachable') && !t.aboutText.includes('Pending')) ||
                    (t.contactText && t.contactText !== 'N/A' && !t.contactText.includes('Site Unreachable') && !t.contactText.includes('Pending')) ||
                    (t.servicesText && t.servicesText !== 'N/A' && !t.servicesText.includes('Site Unreachable') && !t.servicesText.includes('Pending')) ||
                    (t.socials && Object.keys(t.socials).length > 0) ||
                    (t.keywords && t.keywords.length > 0);

    if (hasData) {
      return false; // Successful site with data — DO NOT RETRY!
    }

    return true; // 0-data site — RETRY!
  }

  // ─── Parallel Worker Automation Engine ───────────────────────────────────
  function setToolbarState(mode) {
    const hasErrors = state.tasks.some(t => isTaskNeedingRetry(t));

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
    if (DOM.btnApplyParameters) DOM.btnApplyParameters.addEventListener('click', applyExtractionParameters);
    if (DOM.btnStartMining) DOM.btnStartMining.addEventListener('click', startMiningSession);
    if (DOM.btnPause) DOM.btnPause.addEventListener('click', pauseMining);
    if (DOM.btnResume) DOM.btnResume.addEventListener('click', resumeMining);
    if (DOM.btnStop) DOM.btnStop.addEventListener('click', stopMining);
    if (DOM.btnRestart) DOM.btnRestart.addEventListener('click', startMiningSession);
    if (DOM.btnRetryFailed) DOM.btnRetryFailed.addEventListener('click', retryFailedSites);
    if (DOM.btnClearLog) DOM.btnClearLog.addEventListener('click', () => { if (DOM.consoleLog) DOM.consoleLog.innerHTML = ''; });
    if (DOM.btnCleanData) DOM.btnCleanData.addEventListener('click', cleanExtractedData);
    if (DOM.btnClearHistory) DOM.btnClearHistory.addEventListener('click', clearHistory);

    // Settings Tab Listeners
    const btnClearHistorySettings = document.getElementById('btn-clear-history-settings');
    if (btnClearHistorySettings) btnClearHistorySettings.addEventListener('click', clearHistory);

    const chkSoundSettings = document.getElementById('chk-sound-settings');
    if (chkSoundSettings) {
      chkSoundSettings.addEventListener('change', (e) => {
        if (DOM.chkSound) DOM.chkSound.checked = e.target.checked;
      });
    }

    if (DOM.tableSearch) DOM.tableSearch.addEventListener('input', renderTable);
  }

  function applyExtractionParameters() {
    parseInputURLs();
    if (state.urls.length === 0) {
      alert('Please enter valid website URLs/Domains first!');
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

    updateUI();
    addLog(`⚙️ Extraction parameters & columns applied for ${state.tasks.length} URLs. Click 'Launch Mining Session' to start.`, 'system');
    alert(`Extraction parameters & columns saved successfully for ${state.tasks.length} URLs!`);
  }

  function retryFailedSites() {
    if (state.isRunning) return;

    if (isOptionChecked('chk-skip-dup')) {
      state.tasks = state.tasks.filter(t => t.status !== 'skipped' && t.error !== 'Duplicate Skipped' && (!t.homeText || !t.homeText.includes('Duplicate')));
    }

    const failedTasks = state.tasks.filter(t => isTaskNeedingRetry(t));

    if (failedTasks.length === 0) {
      return alert('No failed or N/A websites to retry!');
    }

    failedTasks.forEach(t => {
      t.status = 'pending';
      t.homeText = 'Pending...';
      t.aboutText = 'N/A';
      t.contactText = 'N/A';
      t.servicesText = 'N/A';
      t.phones = [];
      t.emails = [];
      t.socials = {};
      t.keywords = [];
      t.error = null;
    });

    state.currentIndex = 0;
    state.activeWorkers = 0;
    state.isRunning = true;
    state.isPaused = false;

    if (DOM.sessionStatusBadge) {
      DOM.sessionStatusBadge.textContent = 'Mining Active (Retry)';
      DOM.sessionStatusBadge.className = 'badge badge-running';
    }

    setToolbarState('running');
    startTimer();
    updateUI();
    addLog(`🔄 Retrying ${failedTasks.length} failed & N/A websites with proxy rotation...`, 'system');

    for (let i = 0; i < state.concurrency; i++) {
      spawnWorker();
    }
  }

  window.retryFailedSites = retryFailedSites;

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
    startMiningSession();
  }

  async function spawnWorker() {
    if (!state.isRunning || state.isPaused) return;

    // Non-recursive skip loop for done/skipped tasks to prevent stack overflow RangeError
    while (state.currentIndex < state.tasks.length) {
      const t = state.tasks[state.currentIndex];
      if (t.status !== 'skipped' && t.status !== 'done') break;
      state.currentIndex++;
    }

    if (state.currentIndex >= state.tasks.length) {
      if (state.activeWorkers === 0) finishMiningSession();
      return;
    }

    const taskIndex = state.currentIndex++;
    const task = state.tasks[taskIndex];

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
        if (DOM.chkAbout && DOM.chkAbout.checked) task.aboutText = extracted.aboutTextFromHome;
        if (DOM.chkContact && DOM.chkContact.checked) task.contactText = extracted.contactTextFromHome;
        if (DOM.chkServices && DOM.chkServices.checked) task.servicesText = extracted.servicesTextFromHome;
        if (DOM.chkPhone && DOM.chkPhone.checked) task.phones = extracted.phones;
        if (DOM.chkEmail && DOM.chkEmail.checked) task.emails = extracted.emails;
        if (DOM.chkSocial && DOM.chkSocial.checked) task.socials = extracted.socials;
        task.keywords = extracted.keywords;

        // Parallel Sub-pages Crawler for maximum speed and accuracy
        const subPageEntries = Object.entries(extracted.subPages).filter(([type]) => {
          if (type === 'About Us' && (!DOM.chkAbout || !DOM.chkAbout.checked)) return false;
          if (type === 'Contact Us' && (!DOM.chkContact || !DOM.chkContact.checked)) return false;
          if (type === 'Services' && (!DOM.chkServices || !DOM.chkServices.checked)) return false;
          return true;
        });

        if (subPageEntries.length > 0) {
          addLog(`  ↳ Mining ${subPageEntries.length} sub-pages in parallel for ${task.url}...`);
          const subResults = await Promise.allSettled(
            subPageEntries.map(([type, url]) => fetchWithParallelProxies(url, 4000).then(html => ({ type, url, html })))
          );

          subResults.forEach(res => {
            if (res.status === 'fulfilled' && res.value && res.value.html) {
              const { type, url, html } = res.value;
              const subExtracted = extractPageData(html, url);
              if (type === 'About Us' && DOM.chkAbout && DOM.chkAbout.checked) task.aboutText = subExtracted.text;
              if (type === 'Contact Us' && DOM.chkContact && DOM.chkContact.checked) task.contactText = subExtracted.text;
              if (type === 'Services' && DOM.chkServices && DOM.chkServices.checked) task.servicesText = subExtracted.text;

              if (DOM.chkPhone && DOM.chkPhone.checked) task.phones = Array.from(new Set([...task.phones, ...subExtracted.phones]));
              if (DOM.chkEmail && DOM.chkEmail.checked) task.emails = Array.from(new Set([...task.emails, ...subExtracted.emails]));
              if (subExtracted.keywords && subExtracted.keywords.length) task.keywords = Array.from(new Set([...task.keywords, ...subExtracted.keywords]));
            }
          });
        }

        const hasValidData = (task.phones && task.phones.length > 0) ||
                             (task.emails && task.emails.length > 0) ||
                             (task.socials && Object.keys(task.socials).length > 0) ||
                             (task.keywords && task.keywords.length > 0) ||
                             (task.homeText && task.homeText !== 'N/A' && task.homeText !== 'Not Found' && task.homeText !== 'Pending...' && task.homeText.length > 20) ||
                             (task.aboutText && task.aboutText !== 'N/A' && task.aboutText !== 'Not Found' && task.aboutText !== 'Pending...' && task.aboutText.length > 20) ||
                             (task.contactText && task.contactText !== 'N/A' && task.contactText !== 'Not Found' && task.contactText !== 'Pending...' && task.contactText.length > 20) ||
                             (task.servicesText && task.servicesText !== 'N/A' && task.servicesText !== 'Not Found' && task.servicesText !== 'Pending...' && task.servicesText.length > 20);

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

  function playCompletionChime() {
    if (DOM.chkSound && !DOM.chkSound.checked) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playNote = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playNote(523.25, now, 0.22);
      playNote(659.25, now + 0.14, 0.22);
      playNote(783.99, now + 0.28, 0.35);
    } catch (_) { }
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
    updateUI();
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

  // ─── UI & Table Renderer ─────────────────────────────────────────────────
  function updateUI() {
    const total = state.tasks.length;
    const done = state.tasks.filter(t => t.status === 'done').length;
    const error = state.tasks.filter(t => t.status === 'error').length;
    const skipped = state.tasks.filter(t => t.status === 'skipped').length;
    const processed = done + error + skipped;
    const pct = total === 0 ? '0.0' : ((done / total) * 100).toFixed(1);

    if (DOM.lblProcessed) DOM.lblProcessed.textContent = processed;
    if (DOM.lblTotal) DOM.lblTotal.textContent = total;
    if (DOM.lblPercentage) DOM.lblPercentage.textContent = `${pct}%`;
    if (DOM.progressBarFill) DOM.progressBarFill.style.width = `${pct}%`;

    if (DOM.statTotal) DOM.statTotal.textContent = total;
    if (DOM.statDone) DOM.statDone.textContent = done;
    if (DOM.statError) DOM.statError.textContent = error;
    if (DOM.statSkipped) DOM.statSkipped.textContent = Math.max(skipped, state.duplicates || 0);

    const quickStatus = document.getElementById('quick-status');
    const quickStatusIcon = document.getElementById('quick-status-icon');
    const lblStatusText = document.getElementById('lbl-status-text');

    if (quickStatus && lblStatusText) {
      if (state.isRunning && processed < total) {
        quickStatus.classList.remove('hidden');
        if (quickStatusIcon) quickStatusIcon.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        lblStatusText.textContent = ` Mining: ${processed} / ${total} websites processed (${pct}%)`;
      } else if (!state.isRunning || processed >= total) {
        if (processed > 0) {
          quickStatus.classList.remove('hidden');
          if (quickStatusIcon) quickStatusIcon.innerHTML = `<i class="fa-solid fa-circle-check color-success"></i>`;
          if (skipped > 0) {
            lblStatusText.textContent = ` 🎉 Mining Completed: ${processed}/${total} processed (${pct}%) — ${done} Successful, ${error} Failed, ${skipped} Skipped`;
          } else {
            lblStatusText.textContent = ` 🎉 Mining Completed: ${done}/${total} Successful (${pct}%)`;
          }
        }
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
      DOM.tableBody.innerHTML = `<tr><td colspan="11" class="text-center text-muted">No mined data yet. Click "Launch Mining Session" on Home tab.</td></tr>`;
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
      DOM.tableBody.innerHTML = `<tr><td colspan="11" class="text-center text-muted">No matching results found for "${escapeHtml(searchTerm)}".</td></tr>`;
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

    const phonesHtml = (task.phones && task.phones.length > 0)
      ? task.phones.map(p => `<span class="detail-tag phone-tag"><i class="fa-solid fa-phone"></i> ${escapeHtml(p)}</span>`).join(' ')
      : '<span class="text-muted">N/A</span>';

    const emailsHtml = (task.emails && task.emails.length > 0)
      ? task.emails.map(e => `<span class="detail-tag email-tag"><i class="fa-solid fa-envelope"></i> ${escapeHtml(e)}</span>`).join(' ')
      : '<span class="text-muted">N/A</span>';

    const socialsHtml = (task.socials && Object.keys(task.socials).length > 0)
      ? Object.entries(task.socials).map(([k, v]) => `<a href="${escapeHtml(v)}" target="_blank" class="detail-tag social-tag"><i class="fa-solid fa-share-nodes"></i> <strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</a>`).join(' ')
      : '<span class="text-muted">N/A</span>';

    const keywordsHtml = (task.keywords && task.keywords.length > 0)
      ? task.keywords.map(k => `<span class="detail-tag keyword-tag"><i class="fa-solid fa-tag"></i> ${escapeHtml(k)}</span>`).join(' ')
      : '<span class="text-muted">None</span>';

    DOM.detailModalBody.innerHTML = `
      <div class="detail-view-container">
        <div class="detail-section">
          <h4><i class="fa-solid fa-phone color-accent"></i> Phone Numbers</h4>
          <div class="detail-tags-wrapper">${phonesHtml}</div>
        </div>

        <div class="detail-section">
          <h4><i class="fa-solid fa-envelope color-primary"></i> Email Addresses</h4>
          <div class="detail-tags-wrapper">${emailsHtml}</div>
        </div>

        <div class="detail-section">
          <h4><i class="fa-solid fa-share-nodes color-success"></i> Social Media Links</h4>
          <div class="detail-tags-wrapper">${socialsHtml}</div>
        </div>

        <div class="detail-section">
          <h4><i class="fa-solid fa-tags color-warning"></i> Target Keywords Found</h4>
          <div class="detail-tags-wrapper">${keywordsHtml}</div>
        </div>

        <div class="detail-section">
          <h4><i class="fa-solid fa-house color-accent"></i> Homepage Content</h4>
          <div class="detail-content-box">${escapeHtml(task.homeText)}</div>
        </div>

        <div class="detail-section">
          <h4><i class="fa-solid fa-circle-info color-primary"></i> About Us Content</h4>
          <div class="detail-content-box">${escapeHtml(task.aboutText)}</div>
        </div>

        <div class="detail-section">
          <h4><i class="fa-solid fa-address-book color-success"></i> Contact Us Content</h4>
          <div class="detail-content-box">${escapeHtml(task.contactText)}</div>
        </div>

        <div class="detail-section">
          <h4><i class="fa-solid fa-gear color-warning"></i> Services Content</h4>
          <div class="detail-content-box">${escapeHtml(task.servicesText)}</div>
        </div>
      </div>
    `;

    DOM.modalDetail.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
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
        const modalAuth = document.getElementById('modal-auth');
        if (modalAuth) {
          modalAuth.classList.add('hidden');
          document.body.style.overflow = '';
        }
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
      if ((t.keywords && t.keywords.length > 0) || (DOM.customKeywordsInput && DOM.customKeywordsInput.value.trim())) {
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

    // Add Extended Hidden Metadata (Properties) - Only visible in file properties
    workbook.Props = {
      Author: "Softece",
      LastAuthor: "Softece",
      Title: "Lead Generation Data Grid",
      Subject: "Web Scraped Leads",
      Keywords: "Leads, Scraper, Softece",
      Category: "Data Mining",
      Company: "Softece",
      CreatedDate: new Date()
    };

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mined Data');
    XLSX.writeFile(workbook, `Website_Data_Mined_${Date.now()}.xlsx`);
    if (DOM.modalExport) DOM.modalExport.classList.add('hidden');
  }

  function exportToCSV() {
    if (state.tasks.length === 0) return alert('No data to export!');
    const data = buildExportData();
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const headerRow = headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',');
    const rows = data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','));

    // CSV format doesn't support hidden metadata, so we keep it clean
    const csvContent = '\uFEFF' + [headerRow, ...rows].join('\n');
    downloadFile(csvContent, `Website_Data_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
    if (DOM.modalExport) DOM.modalExport.classList.add('hidden');
  }

  // ─── LocalStorage Session History & Results ───────────────────────────────
  const STORAGE_HISTORY  = 'lgs_history';   // Mining session history list
  const STORAGE_RESULTS  = 'lgs_results';   // All mined task results (full data)
  const STORAGE_USERS    = 'lgs_users';     // Registered user accounts
  const STORAGE_SESSION  = 'lgs_session';   // Current logged-in user
  const STORAGE_AUTH     = 'lgs_auth';      // Auth flag

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
    state.history = state.history.slice(0, 15);
    try {
      localStorage.setItem(STORAGE_HISTORY, JSON.stringify(state.history));
    } catch (_) {
      try {
        state.history = state.history.slice(0, 5);
        localStorage.setItem(STORAGE_HISTORY, JSON.stringify(state.history));
      } catch (_) { }
    }

    // ── Also save full mined results separately under lgs_results
    saveMineResultsToStorage();
    renderHistory();
  }

  // ── Save all mined task results to lgs_results
  function saveMineResultsToStorage() {
    try {
      const results = state.tasks.filter(t => t.status === 'done' || t.status === 'error');
      localStorage.setItem(STORAGE_RESULTS, JSON.stringify(results));
    } catch (err) {
      console.warn('[Storage] Failed to save mined results:', err);
    }
  }

  // ── Load previously mined results from lgs_results
  function loadMineResultsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_RESULTS);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved) && saved.length > 0) {
          state.tasks = saved;
          updateUI();
          addLog(`✅ Loaded ${saved.length} previously mined results from storage.`, 'success');
        }
      }
    } catch (err) {
      console.warn('[Storage] Failed to load mined results:', err);
    }
  }

  function exportToPDF() {
    if (state.tasks.length === 0) return alert('No data to export!');
    if (!window.jspdf || !window.jspdf.jsPDF) {
      return alert('PDF export library is loading, please try again in a moment.');
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');

    // Add Hidden Metadata (Properties)
    doc.setProperties({
      author: 'Softece',
      title: 'Lead Generation Report',
      creator: 'Softece Data Miner',
      subject: 'Data Mining Results',
      keywords: 'lead generation, softece, automated mining'
    });

    doc.setFontSize(18);
    doc.text('Website Data Mining Report', 14, 15);
    doc.setFontSize(11);
    doc.text(`Total Sites: ${state.tasks.length}`, 14, 22);

    const data = buildExportData();
    if (!data.length) return;

    const headers = [Object.keys(data[0])];
    const body = data.map(row => Object.values(row).map(v => String(v).substring(0, 80)));

    doc.autoTable({
      head: headers,
      body: body,
      startY: 28,
      styles: { fontSize: 7 }
    });

    doc.save(`Website_Data_Report_${Date.now()}.pdf`);
    if (DOM.modalExport) DOM.modalExport.classList.add('hidden');
  }

  function exportToJSON() {
    if (state.tasks.length === 0) return alert('No data to export!');
    const data = buildExportData();
    // JSON is kept clean of visible branding properties
    downloadFile(JSON.stringify(data, null, 2), `Website_Data_${Date.now()}.json`, 'application/json');
    if (DOM.modalExport) DOM.modalExport.classList.add('hidden');
  }

  function exportToTXT() {
    if (state.tasks.length === 0) return alert('No data to export!');
    const data = buildExportData();
    if (!data.length) return;

    const headers = Object.keys(data[0]).join('\t');
    const rows = data.map(row => Object.values(row).map(v => String(v).replace(/[\r\n\t]+/g, ' ')).join('\t'));

    const txtContent = [headers, ...rows].join('\n');
    downloadFile(txtContent, `Website_Data_${Date.now()}.txt`, 'text/plain');
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
    state.history = state.history.slice(0, 15); // Cap to 15 sessions max to prevent quota errors
    try {
      localStorage.setItem('data_miner_history', JSON.stringify(state.history));
    } catch (_) {
      try {
        state.history = state.history.slice(0, 5);
        localStorage.setItem('data_miner_history', JSON.stringify(state.history));
      } catch (_) { }
    }
    renderHistory();
  }

  function loadHistoryFromStorage() {
    const raw = localStorage.getItem(STORAGE_HISTORY);
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
          alert('Saved session loaded into workspace!');
        }
      });
    });
  }

  function clearHistory() {
    if (confirm('Delete all saved history sessions from storage?')) {
      state.history = [];
      state.tasks = [];
      localStorage.removeItem(STORAGE_HISTORY);
      localStorage.removeItem(STORAGE_RESULTS);
      updateUI();
      renderHistory();
    }
  }

  // ─── Toast Notification System ───────────────────────────────────────────
  function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item ${type}`;

    let iconClass = 'fa-solid fa-circle-info';
    if (type === 'success') iconClass = 'fa-solid fa-circle-check';
    if (type === 'error') iconClass = 'fa-solid fa-triangle-exclamation';
    if (type === 'warning') iconClass = 'fa-solid fa-circle-exclamation';

    toast.innerHTML = `
      <i class="${iconClass} toast-icon"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, duration);
  }

  // ─── Authentication Controller & User Management ───────────────────────
  function initAuth() {
    seedDefaultUsers();
    restoreUserSession();
    bindAuthEventListeners();
  }

  function seedDefaultUsers() {
    // No demo users seeded — all accounts must be created via Create Account
    const users = getUsersFromStorage();
    if (!Array.isArray(users)) {
      localStorage.setItem(STORAGE_USERS, JSON.stringify([]));
    }
  }

  function getUsersFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_USERS);
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function getCurrentUser() {
    try {
      const stored = localStorage.getItem(STORAGE_SESSION);
      if (!stored || stored === 'null' || stored === 'undefined') return null;
      const parsed = JSON.parse(stored);
      return (parsed && typeof parsed === 'object') ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function setCurrentUser(user) {
    console.log('[Auth System] setCurrentUser called:', user);
    try {
      if (user) {
        localStorage.setItem(STORAGE_SESSION, JSON.stringify(user));
        localStorage.setItem(STORAGE_AUTH, 'true');
      } else {
        localStorage.removeItem(STORAGE_SESSION);
        localStorage.removeItem(STORAGE_AUTH);
      }
    } catch (err) {
      console.warn('[Auth System] Failed to update current user session in storage:', err);
    }
    updateHeaderUI(user);
  }

  function restoreUserSession() {
    const current = getCurrentUser();
    console.log('[Auth System] Restoring user session:', current);
    updateHeaderUI(current);
  }

  function updateHeaderUI(user) {
    console.log('[Auth System] updateHeaderUI rendering state:', user ? 'LOGGED_IN' : 'GUEST');
    const btnOpenAuth = document.getElementById('btn-open-auth');
    const userProfileMenu = document.getElementById('user-profile-menu');
    const profileDropdown = document.getElementById('profile-dropdown');

    const modalAuth = document.getElementById('modal-auth');
    const appContainer = document.getElementById('app-container');

    if (user) {
      // User IS logged in -> Show Dashboard Home Page, Hide Auth Page Mode
      if (appContainer) {
        appContainer.classList.remove('hidden');
        appContainer.style.setProperty('display', 'flex', 'important');
      }

      if (modalAuth) {
        modalAuth.classList.add('hidden');
        modalAuth.classList.remove('auth-page-mode');
        modalAuth.style.setProperty('display', 'none', 'important');
        modalAuth.style.display = 'none'; // Extra safety
      }
      document.body.style.overflow = 'auto';

      if (btnOpenAuth) btnOpenAuth.classList.add('hidden');
      if (userProfileMenu) userProfileMenu.classList.remove('hidden');

      const avatarBadge = document.getElementById('header-user-avatar');
      const nameText = document.getElementById('header-user-name');
      const planBadge = document.getElementById('header-user-plan');

      const dropdownAvatar = document.getElementById('dropdown-user-avatar');
      const dropdownName = document.getElementById('dropdown-user-name');
      const dropdownEmail = document.getElementById('dropdown-user-email');
      const dropdownPlan = document.getElementById('dropdown-user-plan');

      let initials = 'U';
      if (user.avatar) {
        initials = user.avatar;
      } else if (user.fullname) {
        const parts = user.fullname.trim().split(/\s+/).filter(Boolean);
        initials = parts.map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U';
      }

      if (avatarBadge) avatarBadge.textContent = initials;
      if (nameText) nameText.textContent = user.fullname || 'User';
      if (planBadge) planBadge.innerHTML = `<i class="fa-solid fa-bolt"></i> ${user.plan || 'Pro'}`;

      if (dropdownAvatar) dropdownAvatar.textContent = initials;
      if (dropdownName) dropdownName.textContent = user.fullname || 'User';
      if (dropdownEmail) dropdownEmail.textContent = user.email || '';
      if (dropdownPlan) dropdownPlan.innerHTML = `<i class="fa-solid fa-crown"></i> ${user.plan || 'Pro Tier'}`;

      // Update Sidebar Profile
      const sideAvatar = document.getElementById('sidebar-avatar');
      const sideName = document.getElementById('sidebar-name');
      const sidePlan = document.getElementById('sidebar-plan');
      if (sideAvatar) sideAvatar.textContent = initials;
      if (sideName) sideName.textContent = user.fullname || 'User';
      if (sidePlan) sidePlan.textContent = user.plan || 'Pro Tier';

    } else {
      // User IS NOT logged in -> Show Auth Page Mode first, Hide Dashboard
      if (appContainer) {
        appContainer.classList.add('hidden');
        appContainer.style.display = 'none';
      }

      if (modalAuth) {
        modalAuth.classList.remove('hidden');
        modalAuth.classList.add('auth-page-mode');
        modalAuth.style.display = 'flex';
      }
      document.body.style.overflow = 'hidden';

      if (btnOpenAuth) btnOpenAuth.classList.remove('hidden');
      if (userProfileMenu) userProfileMenu.classList.add('hidden');
      if (profileDropdown) profileDropdown.classList.add('hidden');
    }
  }

  function bindAuthEventListeners() {
    const modalAuth = document.getElementById('modal-auth');
    const btnOpenAuth = document.getElementById('btn-open-auth');
    const btnCloseAuth = document.getElementById('btn-close-auth');
    const btnUserAvatar = document.getElementById('btn-user-avatar');
    const profileDropdown = document.getElementById('profile-dropdown');
    const btnLogout = document.getElementById('btn-auth-logout');

    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const btnSubmitLogin = document.getElementById('btn-submit-login');

    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const tabIndicator = document.getElementById('tab-indicator');

    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const formForgot = document.getElementById('form-forgot');

    const alertBox = document.getElementById('auth-alert-box');
    const alertMsg = document.getElementById('auth-alert-msg');

    function showAlert(msg, isSuccess = false) {
      if (!alertBox || !alertMsg) return;
      alertMsg.textContent = msg;
      alertBox.className = isSuccess ? 'auth-alert success' : 'auth-alert';
      alertBox.classList.remove('hidden');
    }

    function hideAlert() {
      if (alertBox) alertBox.classList.add('hidden');
    }

    // Modal Visibility Toggle
    if (btnOpenAuth) {
      btnOpenAuth.addEventListener('click', () => {
        hideAlert();
        switchAuthTab('form-login');
        if (modalAuth) {
          modalAuth.classList.remove('hidden');
          document.body.style.overflow = 'hidden';
        }
      });
    }

    if (btnCloseAuth) {
      btnCloseAuth.addEventListener('click', () => {
        if (modalAuth) {
          modalAuth.classList.add('hidden');
          document.body.style.overflow = '';
        }
      });
    }

    if (modalAuth) {
      modalAuth.addEventListener('click', (e) => {
        if (e.target === modalAuth) {
          modalAuth.classList.add('hidden');
          document.body.style.overflow = '';
        }
      });
    }

    // Profile Dropdown Toggle & Outside Click
    if (btnUserAvatar && profileDropdown) {
      btnUserAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!profileDropdown.classList.contains('hidden') && !profileDropdown.contains(e.target) && e.target !== btnUserAvatar) {
          profileDropdown.classList.add('hidden');
        }
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        setCurrentUser(null);
        showToast('You have been signed out successfully.', 'info');
      });
    }

    const btnAccountSettings = document.getElementById('btn-open-account-settings');
    if (btnAccountSettings) {
      btnAccountSettings.addEventListener('click', () => {
        if (profileDropdown) profileDropdown.classList.add('hidden');

        // Switch to settings tab
        const settingsBtn = document.querySelector('.nav-btn[data-tab="tab-settings"]');
        if (settingsBtn) {
          settingsBtn.click();
        } else {
          const currentUser = getCurrentUser();
          if (currentUser) {
            showToast(`Account: ${currentUser.fullname} (${currentUser.email}) | Tier: ${currentUser.plan}`, 'info', 4500);
          }
        }
      });
    }

    // Caps Lock Warning Detector
    const capsWarning = document.getElementById('login-caps-warning');
    if (loginPasswordInput && capsWarning) {
      loginPasswordInput.addEventListener('keyup', (e) => {
        if (e.getModifierState && e.getModifierState('CapsLock')) {
          capsWarning.classList.remove('hidden');
        } else {
          capsWarning.classList.add('hidden');
        }
      });
    }

    // Tab Switching Function
    function switchAuthTab(targetFormId) {
      hideAlert();
      [formLogin, formRegister, formForgot].forEach(f => {
        if (f) f.classList.remove('active');
      });

      if (targetFormId === 'form-login') {
        if (tabLogin) tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
        if (tabIndicator) tabIndicator.style.transform = 'translateX(0)';
        if (formLogin) formLogin.classList.add('active');
      } else if (targetFormId === 'form-register') {
        if (tabRegister) tabRegister.classList.add('active');
        if (tabLogin) tabLogin.classList.remove('active');
        if (tabIndicator) tabIndicator.style.transform = 'translateX(100%)';
        if (formRegister) formRegister.classList.add('active');
      } else if (targetFormId === 'form-forgot') {
        if (tabLogin) tabLogin.classList.remove('active');
        if (tabRegister) tabRegister.classList.remove('active');
        if (formForgot) formForgot.classList.add('active');
      }
    }

    if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('form-login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchAuthTab('form-register'));

    const linkForgotPass = document.getElementById('link-forgot-password');
    const linkGotoReg = document.getElementById('link-goto-register');
    const linkGotoLogin = document.getElementById('link-goto-login');
    const linkBackToLogin = document.getElementById('link-back-to-login');

    if (linkForgotPass) linkForgotPass.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('form-forgot'); });
    if (linkGotoReg) linkGotoReg.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('form-register'); });
    if (linkGotoLogin) linkGotoLogin.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('form-login'); });
    if (linkBackToLogin) linkBackToLogin.addEventListener('click', (e) => { e.preventDefault(); switchAuthTab('form-login'); });

    // Eye Toggle Password Visibility
    const btnToggleLoginPass = document.getElementById('btn-toggle-login-pass');
    if (btnToggleLoginPass && loginPasswordInput) {
      btnToggleLoginPass.addEventListener('click', () => {
        const type = loginPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        loginPasswordInput.setAttribute('type', type);
        btnToggleLoginPass.innerHTML = type === 'password' ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
      });
    }

    const btnToggleRegPass = document.getElementById('btn-toggle-reg-pass');
    const regPasswordInput = document.getElementById('reg-password');
    if (btnToggleRegPass && regPasswordInput) {
      btnToggleRegPass.addEventListener('click', () => {
        const type = regPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        regPasswordInput.setAttribute('type', type);
        btnToggleRegPass.innerHTML = type === 'password' ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
      });
    }

    const btnFillDemo = document.getElementById('btn-fill-demo');
    if (btnFillDemo) {
      btnFillDemo.addEventListener('click', (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        hideAlert();
        showAlert('Demo mode is disabled. Please create an account to login.', true);
      });
    }

    // Live Password Strength Checker
    if (regPasswordInput) {
      regPasswordInput.addEventListener('input', () => {
        const val = regPasswordInput.value;
        const barFill = document.getElementById('strength-bar-fill');
        const labelText = document.getElementById('strength-label-text');

        const critLen = document.getElementById('crit-length');
        const critUpper = document.getElementById('crit-upper');
        const critNum = document.getElementById('crit-number');
        const critSym = document.getElementById('crit-symbol');

        const hasLen = val.length >= 8;
        const hasUpper = /[A-Z]/.test(val) && /[a-z]/.test(val);
        const hasNum = /[0-9]/.test(val);
        const hasSym = /[^A-Za-z0-9]/.test(val);

        if (critLen) critLen.classList.toggle('valid', hasLen);
        if (critUpper) critUpper.classList.toggle('valid', hasUpper);
        if (critNum) critNum.classList.toggle('valid', hasNum);
        if (critSym) critSym.classList.toggle('valid', hasSym);

        let score = 0;
        if (hasLen) score++;
        if (hasUpper) score++;
        if (hasNum) score++;
        if (hasSym) score++;

        if (!val) score = 0;

        if (barFill && labelText) {
          barFill.className = 'strength-bar-fill';
          labelText.className = 'strength-text';

          if (score <= 1) {
            barFill.classList.add('strength-weak');
            labelText.classList.add('text-weak');
            labelText.textContent = val ? 'Weak' : 'Too Short';
          } else if (score === 2) {
            barFill.classList.add('strength-fair');
            labelText.classList.add('text-fair');
            labelText.textContent = 'Fair';
          } else if (score === 3) {
            barFill.classList.add('strength-strong');
            labelText.classList.add('text-strong');
            labelText.textContent = 'Strong';
          } else if (score === 4) {
            barFill.classList.add('strength-excellent');
            labelText.classList.add('text-excellent');
            labelText.textContent = 'Excellent';
          }
        }
      });
    }

    // Live Password Match Indicator
    const regConfirmPass = document.getElementById('reg-confirm-password');
    const matchIndicator = document.getElementById('match-indicator');
    if (regConfirmPass && regPasswordInput && matchIndicator) {
      regConfirmPass.addEventListener('input', () => {
        const p1 = regPasswordInput.value;
        const p2 = regConfirmPass.value;
        if (p2.length > 0 && p1 === p2) {
          matchIndicator.classList.remove('hidden');
        } else {
          matchIndicator.classList.add('hidden');
        }
      });
    }

    // Social Auth Single Sign-On Simulation
    ['btn-social-google', 'btn-social-github', 'btn-social-microsoft'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          const provider = id.includes('google') ? 'Google' : (id.includes('github') ? 'GitHub' : 'Microsoft');
          const socialUser = {
            fullname: `${provider} User`,
            email: `user@${provider.toLowerCase()}.com`,
            company: 'Cloud Corp',
            role: 'agency',
            plan: 'Pro Tier',
            avatar: provider[0],
            createdAt: new Date().toISOString()
          };
          setCurrentUser(socialUser);
          if (modalAuth) modalAuth.classList.add('hidden');
          document.body.style.overflow = '';
          showToast(`Successfully authenticated via ${provider}! Welcome back.`, 'success');
        });
      }
    });

    // Submit Handler: FORM LOGIN
    function handleLoginSubmit(e) {
      if (e) {
        e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
      }
      console.log('[Auth System] handleLoginSubmit executed by event:', e ? e.type : 'manual trigger');
      hideAlert();

      const emailEl = document.getElementById('login-email');
      const passEl = document.getElementById('login-password');

      let email = (emailEl ? emailEl.value : '').trim().toLowerCase();
      let password = passEl ? passEl.value : '';

      if (!email || !password) {
        showAlert('Please enter your email and password.');
        return;
      }

      console.log(`[Auth System] Attempting login for email: "${email}"`);

      const users = getUsersFromStorage();
      const found = users.find(u => u && u.email && u.email.toLowerCase() === email && u.password === password);

      if (!found) {
        // User not found → show error
        console.log('[Auth System] Login failed: user not found for email:', email);
        showAlert('Invalid email or password. Please check your credentials and try again.');
        btn.classList.remove('is-loading');
        return;
      }

      console.log('[Auth System] Authentication successful, setting user session:', found.email);
      setCurrentUser(found);
      showToast(`Welcome back, ${found.fullname}!`, 'success');

      // Navigate to home tab on successful login
      const homeBtn = document.querySelector('.nav-btn[data-tab="tab-home"]');
      if (homeBtn) homeBtn.click();
    }

    if (formLogin) {
      formLogin.addEventListener('submit', handleLoginSubmit);
    }
    if (btnSubmitLogin) {
      btnSubmitLogin.addEventListener('click', (e) => {
        // If formLogin exists, firing handleLoginSubmit manually on click could collide with submit event.
        // If form exists, trigger form submit manually so HTML5 novalidate and submit event handle it cleanly.
        if (formLogin) {
          e.preventDefault();
          handleLoginSubmit(e);
        } else {
          handleLoginSubmit(e);
        }
      });
    }

    // Submit Handler: FORM REGISTER
    if (formRegister) {
      formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        hideAlert();

        const fullname = (document.getElementById('reg-fullname')?.value || '').trim();
        const email = (document.getElementById('reg-email')?.value || '').trim().toLowerCase();
        const company = (document.getElementById('reg-company')?.value || '').trim();
        const role = document.getElementById('reg-role')?.value || 'agency';
        const password = document.getElementById('reg-password')?.value || '';
        const confirmPassword = document.getElementById('reg-confirm-password')?.value || '';
        const chkTerms = document.getElementById('chk-terms');

        if (!fullname || !email || !password || !confirmPassword) {
          return showAlert('Please fill in all required fields.');
        }

        if (chkTerms && !chkTerms.checked) {
          return showAlert('You must accept the Terms of Service & Privacy Policy.');
        }

        if (password !== confirmPassword) {
          return showAlert('Passwords do not match. Please verify your password.');
        }

        if (password.length < 6) {
          return showAlert('Password must be at least 6 characters long.');
        }

        const users = getUsersFromStorage();
        if (users.some(u => u.email.toLowerCase() === email)) {
          return showAlert('An account with this email address already exists!');
        }

        const initials = fullname.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() || 'U';
        const newUser = {
          fullname,
          email,
          password,
          company: company || 'My Company',
          role,
          plan: role === 'enterprise' ? 'Enterprise' : (role === 'agency' ? 'Pro Tier' : 'Starter'),
          avatar: initials,
          createdAt: new Date().toISOString()
        };

        users.push(newUser);
        localStorage.setItem(STORAGE_USERS, JSON.stringify(users));

        setCurrentUser(newUser);
        if (modalAuth) modalAuth.classList.add('hidden');
        document.body.style.overflow = '';
        showToast(`Account created successfully! Welcome ${fullname}.`, 'success');
      });
    }

    // Submit Handler: FORM FORGOT PASSWORD
    if (formForgot) {
      formForgot.addEventListener('submit', (e) => {
        e.preventDefault();
        hideAlert();

        const email = (document.getElementById('forgot-email')?.value || '').trim();
        if (!email) {
          return showAlert('Please enter your account email address.');
        }

        showAlert(`Password reset link has been dispatched to ${email}! Check your inbox.`, true);
        showToast(`Password reset link sent to ${email}`, 'success');

        setTimeout(() => {
          switchAuthTab('form-login');
        }, 2500);
      });
    }
  }

  window.init = init;
  window.startMiningSession = startMiningSession;
  window.retryFailedSites = retryFailedSites;
  window.closeModalDetail = closeModalDetail;
  window.closeModalExport = closeModalExport;
  window.applyExtractionParameters = applyExtractionParameters;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
