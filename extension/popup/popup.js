/**
 * TermsGuard AI — Popup Controller
 */

(async () => {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  let currentTab    = null;
  let currentMode   = 'balanced';
  let currentResult = null;
  let currentLang   = 'es';
  let pollingActive = false;

  // ── Strings (i18n) ─────────────────────────────────────────
  const STRINGS = {
    es: {
      hero_text:                'Analiza los Términos y Condiciones de esta página con IA',
      mode_quick:               'Rápido',
      mode_balanced:            'Equilibrado',
      mode_deep:                'Profundo',
      btn_analyze:              'Analizar esta página',
      btn_explain12:            'Explicar como si tuviera 12 años',
      btn_cancel:               'Cancelar',
      loading_extracting:       'Extrayendo texto...',
      loading_sub:              'Preparando análisis con IA',
      loading_connecting:       'Conectando con la IA',
      loading_analyzing:        'Analizando con IA...',
      loading_finalizing:       'Finalizando análisis...',
      tab_summary:              '📄 Resumen',
      tab_risks:                '⚠️ Riesgos',
      tab_detail:               '🔍 Detalle',
      score_label:              'Riesgo',
      btn_new:                  'Nuevo',
      error_default_title:      'Algo salió mal',
      btn_retry:                'Reintentar',
      btn_back:                 'Volver',
      err_no_content:           'Sin contenido detectado',
      err_no_api_key:           'API key no configurada',
      err_invalid_key:          'API key inválida',
      err_rate_limit:           'Límite de uso alcanzado',
      err_api_error:            'Error de la IA',
      err_default:              'Error en el análisis',
      err_default_msg:          'Por favor, intenta de nuevo.',
      err_no_content_msg:       'Esta página no tiene suficiente contenido para analizar. Probá en una página de términos y condiciones.',
      err_no_api_key_msg:       'Configurá una API key para comenzar.',
      err_invalid_key_msg:      'Tu API key no es válida o no tiene permisos. Verificá tu clave en el sitio del proveedor.',
      err_rate_limit_msg:       'Alcanzaste el límite de uso de la IA. Esperá unos minutos e intentá de nuevo.',
      poll_no_response_title:   'Sin respuesta',
      poll_no_response_msg:     'No se pudo contactar el proceso en segundo plano.',
      poll_timeout_title:       'Tiempo agotado',
      poll_timeout_msg:         'El análisis tardó demasiado. Intenta de nuevo.',
      no_results_title:         'Sin resultados',
      no_results_msg:           'La IA no devolvió resultados. Intenta de nuevo.',
      no_clause:                '✓ No se encontraron cláusulas problemáticas graves',
      detail_empty:             'Sin información adicional.',
      risk_high:                'ALTO',
      risk_medium:              'MEDIO',
      risk_low:                 'BAJO',
      verdict_high:             'Condiciones de alto riesgo',
      verdict_medium:           'Riesgos moderados detectados',
      verdict_low:              'Condiciones relativamente seguras',
      conn_error:               'Error de conexión',
      page_detected:            '✓ Página legal detectada — lista para analizar',
      ob_title:                 'Configura tu clave de IA',
      ob_desc:                  'TermsGuard usa tu propia API key. Tus documentos nunca pasan por nuestros servidores.',
      ob_step1:                 'Entra a',
      ob_step2_pre:             'Haz click en',
      ob_step2_free:            '(gratis, solo necesitas cuenta Google)',
      ob_step3:                 'Copia y pega tu clave aquí abajo',
      ob_placeholder:           'AIzaSy...',
      ob_btn_start:             'Comenzar →',
      ob_alt_text:              '¿Tienes clave de OpenAI o Anthropic?',
      ob_alt_link:              'Configurar otro proveedor',
      ob_status_empty:          'Pega tu API key primero.',
      settings_title:           'Configuración',
      settings_provider:        'Proveedor de IA',
      provider_gemini:          'Gemini (Google) — Gratuito',
      provider_openai:          'OpenAI — GPT-4o mini',
      provider_anthropic:       'Anthropic — Claude Haiku',
      settings_apikey:          'API Key',
      apikey_placeholder:       'Tu clave API...',
      settings_language:        'Idioma de la extensión',
      settings_autodetect:      'Detección automática',
      settings_autodetect_desc: 'Detectar páginas legales al cargar',
      btn_save:                 'Guardar configuración',
      settings_saved:           '✓ Configuración guardada',
      settings_error:           'Error al guardar',
      hint_gemini_text:         'Obtén tu clave gratis en',
      hint_openai_text:         'Obtén tu clave en',
      hint_anthropic_text:      'Obtén tu clave en',
      mode_desc_quick:          'Solo los 3-5 riesgos más críticos. Rápido y directo.',
      mode_desc_balanced:       'Análisis completo pero enfocado. Recomendado para la mayoría de los casos.',
      mode_desc_deep:           'Máximo detalle. Detecta hasta los riesgos más pequeños.',
      history_title:            'Historial',
      history_empty:            'Todavía no hay análisis guardados.\nHacé tu primer análisis para verlo acá.',
      history_now:              'Ahora',
      history_minutes:          'hace {n} min',
      history_hours:            'hace {n} h',
      history_days:             'hace {n} d',
      history_clear_confirm:    '¿Borrar todo?',
      history_cleared:          'Historial borrado',
    },
    en: {
      hero_text:                'Analyze the Terms and Conditions of this page with AI',
      mode_quick:               'Quick',
      mode_balanced:            'Balanced',
      mode_deep:                'Deep',
      btn_analyze:              'Analyze this page',
      btn_explain12:            'Explain like I\'m 12',
      btn_cancel:               'Cancel',
      loading_extracting:       'Extracting text...',
      loading_sub:              'Preparing AI analysis',
      loading_connecting:       'Connecting to AI',
      loading_analyzing:        'Analyzing with AI...',
      loading_finalizing:       'Finalizing analysis...',
      tab_summary:              '📄 Summary',
      tab_risks:                '⚠️ Risks',
      tab_detail:               '🔍 Detail',
      score_label:              'Risk',
      btn_new:                  'New',
      error_default_title:      'Something went wrong',
      btn_retry:                'Retry',
      btn_back:                 'Back',
      err_no_content:           'No content detected',
      err_no_api_key:           'API key not configured',
      err_invalid_key:          'Invalid API key',
      err_rate_limit:           'Usage limit reached',
      err_api_error:            'AI error',
      err_default:              'Analysis error',
      err_default_msg:          'Please try again.',
      err_no_content_msg:       'This page doesn\'t have enough content to analyze. Try on a terms and conditions page.',
      err_no_api_key_msg:       'Set up an API key to get started.',
      err_invalid_key_msg:      'Your API key is invalid or lacks permissions. Check your key at the provider\'s website.',
      err_rate_limit_msg:       'You\'ve reached the AI usage limit. Wait a few minutes and try again.',
      poll_no_response_title:   'No response',
      poll_no_response_msg:     'Could not contact the background process.',
      poll_timeout_title:       'Timed out',
      poll_timeout_msg:         'Analysis took too long. Try again.',
      no_results_title:         'No results',
      no_results_msg:           'The AI returned no results. Try again.',
      no_clause:                '✓ No serious problematic clauses found',
      detail_empty:             'No additional information.',
      risk_high:                'HIGH',
      risk_medium:              'MEDIUM',
      risk_low:                 'LOW',
      verdict_high:             'High-risk conditions',
      verdict_medium:           'Moderate risks detected',
      verdict_low:              'Relatively safe conditions',
      conn_error:               'Connection error',
      page_detected:            '✓ Legal page detected — ready to analyze',
      ob_title:                 'Set up your AI key',
      ob_desc:                  'TermsGuard uses your own API key. Your documents never pass through our servers.',
      ob_step1:                 'Go to',
      ob_step2_pre:             'Click on',
      ob_step2_free:            '(free, you only need a Google account)',
      ob_step3:                 'Copy and paste your key below',
      ob_placeholder:           'AIzaSy...',
      ob_btn_start:             'Get started →',
      ob_alt_text:              'Have an OpenAI or Anthropic key?',
      ob_alt_link:              'Configure another provider',
      ob_status_empty:          'Paste your API key first.',
      settings_title:           'Settings',
      settings_provider:        'AI Provider',
      provider_gemini:          'Gemini (Google) — Free',
      provider_openai:          'OpenAI — GPT-4o mini',
      provider_anthropic:       'Anthropic — Claude Haiku',
      settings_apikey:          'API Key',
      apikey_placeholder:       'Your API key...',
      settings_language:        'Extension language',
      settings_autodetect:      'Auto-detection',
      settings_autodetect_desc: 'Detect legal pages on load',
      btn_save:                 'Save settings',
      settings_saved:           '✓ Settings saved',
      settings_error:           'Error saving',
      hint_gemini_text:         'Get your free key at',
      hint_openai_text:         'Get your key at',
      hint_anthropic_text:      'Get your key at',
      mode_desc_quick:          'Only the 3-5 most critical risks. Fast and direct.',
      mode_desc_balanced:       'Complete but focused analysis. Recommended for most cases.',
      mode_desc_deep:           'Maximum depth. Detects even minor risks.',
      history_title:            'History',
      history_empty:            'No analyses saved yet.\nRun your first analysis to see it here.',
      history_now:              'Just now',
      history_minutes:          '{n} min ago',
      history_hours:            '{n} h ago',
      history_days:             '{n} d ago',
      history_clear_confirm:    'Delete all?',
      history_cleared:          'History cleared',
    }
  };

  function t(key) {
    return (STRINGS[currentLang] || STRINGS.es)[key] || key;
  }

  function applyLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    if (els.modeDesc) els.modeDesc.textContent = t(`mode_desc_${currentMode}`);
  }

  // ── DOM refs ───────────────────────────────────────────────
  const views = {
    home:        document.getElementById('viewHome'),
    loading:     document.getElementById('viewLoading'),
    results:     document.getElementById('viewResults'),
    error:       document.getElementById('viewError'),
    settings:    document.getElementById('viewSettings'),
    onboarding:  document.getElementById('viewOnboarding'),
    history:     document.getElementById('viewHistory')
  };

  const els = {
    analyzeBtn:         document.getElementById('analyzeBtn'),
    explain12Btn:       document.getElementById('explain12Btn'),
    pageStatus:         document.getElementById('pageStatus'),
    loadingText:        document.getElementById('loadingText'),
    loadingFill:        document.getElementById('loadingFill'),
    loadingSub:         document.getElementById('loadingSub'),
    scoreCircle:        document.getElementById('scoreCircle'),
    scoreValue:         document.getElementById('scoreValue'),
    scoreVerdict:       document.getElementById('scoreVerdict'),
    scoreSite:          document.getElementById('scoreSite'),
    summaryIntro:       document.getElementById('summaryIntro'),
    summaryBullets:     document.getElementById('summaryBullets'),
    risksList:          document.getElementById('risksList'),
    detailContent:      document.getElementById('detailContent'),
    newAnalysisBtn:     document.getElementById('newAnalysisBtn'),
    cancelBtn:          document.getElementById('cancelBtn'),
    retryBtn:           document.getElementById('retryBtn'),
    backBtn:            document.getElementById('backBtn'),
    errorTitle:         document.getElementById('errorTitle'),
    errorMessage:       document.getElementById('errorMessage'),
    settingsBtn:        document.getElementById('settingsBtn'),
    settingsBackBtn:    document.getElementById('settingsBackBtn'),
    saveSettingsBtn:    document.getElementById('saveSettingsBtn'),
    settingsStatus:     document.getElementById('settingsStatus'),
    providerSelect:     document.getElementById('providerSelect'),
    apiKeyInput:        document.getElementById('apiKeyInput'),
    apiKeyHint:         document.getElementById('apiKeyHint'),
    autoDetect:         document.getElementById('autoDetect'),
    languageSelect:     document.getElementById('languageSelect'),
    onboardingKey:      document.getElementById('onboardingKey'),
    onboardingSaveBtn:  document.getElementById('onboardingSaveBtn'),
    obStatus:           document.getElementById('obStatus'),
    obOtherProviderBtn: document.getElementById('obOtherProviderBtn'),
    historyBtn:         document.getElementById('historyBtn'),
    historyBackBtn:     document.getElementById('historyBackBtn'),
    historyList:        document.getElementById('historyList'),
    clearHistoryBtn:    document.getElementById('clearHistoryBtn'),
    modeDesc:           document.getElementById('modeDesc'),
    modeBtns:           document.querySelectorAll('.mode-btn'),
    tabs:               document.querySelectorAll('.tab'),
    tabContents:        document.querySelectorAll('.tab-content')
  };

  // ── View management ────────────────────────────────────────
  function showView(name) {
    Object.entries(views).forEach(([k, el]) => {
      el.classList.toggle('active', k === name);
    });
  }

  // ── External links (open in new tab) ──────────────────────
  document.addEventListener('click', e => {
    const link = e.target.closest('.ext-link');
    if (link) {
      e.preventDefault();
      chrome.tabs.create({ url: link.dataset.url });
    }
  });

  // ── Tab management ─────────────────────────────────────────
  els.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      els.tabs.forEach(tabEl => tabEl.classList.remove('active'));
      els.tabContents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab${capitalize(target)}`).classList.add('active');
    });
  });

  // ── Mode selector ──────────────────────────────────────────
  function updateModeDesc() {
    els.modeDesc.textContent = t(`mode_desc_${currentMode}`);
  }

  function setMode(mode) {
    currentMode = mode;
    els.modeBtns.forEach(b => b.classList.toggle('selected', b.dataset.mode === mode));
    updateModeDesc();
  }

  els.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setMode(btn.dataset.mode);
      sendBg('SAVE_CONFIG', { config: { analysisMode: btn.dataset.mode } }).catch(() => {});
    });
  });

  setMode('balanced');

  // ── Background messaging ───────────────────────────────────
  function sendBg(action, extra = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action, tabId: currentTab?.id, ...extra },
        response => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  function sendToContent(action, extra = {}) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(currentTab.id, { action, ...extra }, resolve);
    });
  }

  // ── Init ───────────────────────────────────────────────────
  async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab;

    // Load config and apply language + mode before rendering anything
    const config = await sendBg('GET_CONFIG').catch(() => ({}));
    applyLanguage(config.language || 'es');
    setMode(config.analysisMode || 'balanced');

    const state = await sendBg('GET_STATE').catch(() => null);

    if (state?.status === 'done' && state.result) {
      currentResult = state.result;
      renderResults(state.result, state.url || tab.url);
      showView('results');
      return;
    }

    if (state?.status === 'analyzing') {
      showLoadingView(30, t('loading_analyzing'));
      pollForResults();
      return;
    }

    if (!config.apiKey) {
      showView('onboarding');
      return;
    }

    const isLegal = await sendToContent('CHECK_LEGAL_PAGE').catch(() => ({ isLegal: false }));
    if (isLegal?.isLegal) {
      els.pageStatus.textContent = t('page_detected');
      els.pageStatus.classList.add('detected');
    }

    showView('home');
  }

  // ── Loading view ───────────────────────────────────────────
  function showLoadingView(progress, text, sub) {
    showView('loading');
    if (text) els.loadingText.textContent = text;
    if (sub)  els.loadingSub.textContent  = sub;
    els.loadingFill.style.width = `${progress}%`;
  }

  function updateProgress(p, text, sub) {
    els.loadingFill.style.width = `${p}%`;
    if (text) els.loadingText.textContent = text;
    if (sub)  els.loadingSub.textContent  = sub;
  }

  // ── Poll for results ───────────────────────────────────────
  async function pollForResults() {
    pollingActive = true;
    let attempts = 0;
    const maxAttempts = 120;

    const tick = async () => {
      if (!pollingActive) return;
      const state = await sendBg('GET_STATE').catch(() => null);

      if (!state) {
        showErrorView(t('poll_no_response_title'), t('poll_no_response_msg'));
        return;
      }

      if (state.status === 'done') {
        currentResult = state.result;
        renderResults(state.result, state.url || currentTab?.url);
        showView('results');
        return;
      }

      if (state.status === 'error') {
        if (state.errorCode === 'NO_API_KEY') {
          showView('onboarding');
          return;
        }
        showErrorView(getErrorTitle(state.errorCode), getErrorMessage(state.errorCode, state.error));
        return;
      }

      if (state.status === 'analyzing') {
        const progress = state.progress || 30;
        updateProgress(
          progress,
          progress < 40 ? t('loading_extracting') :
          progress < 70 ? t('loading_analyzing') :
          t('loading_finalizing')
        );
      }

      if (++attempts < maxAttempts) {
        setTimeout(tick, 1000);
      } else {
        showErrorView(t('poll_timeout_title'), t('poll_timeout_msg'));
      }
    };

    tick();
  }

  // ── Trigger analysis ───────────────────────────────────────
  async function startAnalysis(mode) {
    els.analyzeBtn.disabled   = true;
    els.explain12Btn.disabled = true;
    showLoadingView(10, t('loading_extracting'), t('loading_connecting'));
    try {
      await sendBg('START_ANALYSIS', { mode });
      pollForResults();
    } catch (err) {
      els.analyzeBtn.disabled   = false;
      els.explain12Btn.disabled = false;
      showErrorView(t('conn_error'), err.message);
    }
  }

  // ── Render results ─────────────────────────────────────────
  function renderResults(result, url) {
    if (!result) {
      showErrorView(t('no_results_title'), t('no_results_msg'));
      return;
    }

    const score = result.risk_score ?? 50;
    renderScore(score);
    els.scoreSite.textContent    = extractDomain(url || '');
    els.scoreVerdict.textContent = result.verdict || getDefaultVerdict(score);

    els.summaryIntro.textContent = result.summary_intro || result.summary || '';
    renderBullets(result.summary_bullets || []);
    renderRisks(result.risks || []);
    renderDetail(result.detail || result.detailed_explanation || '');

    els.tabs.forEach(tab => tab.classList.remove('active'));
    els.tabContents.forEach(c => c.classList.remove('active'));
    document.querySelector('[data-tab="summary"]')?.classList.add('active');
    document.getElementById('tabSummary')?.classList.add('active');
  }

  function renderScore(score) {
    const circumference = 251.2;
    const offset = circumference - (score / 100) * circumference;
    els.scoreCircle.style.strokeDashoffset = offset;

    const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f97316' : '#10b981';
    els.scoreCircle.style.stroke = color;
    els.scoreValue.textContent   = score;
    els.scoreValue.style.color   = color;
  }

  function renderBullets(bullets) {
    els.summaryBullets.innerHTML = '';
    bullets.forEach(text => {
      const li = document.createElement('li');
      li.className = 'bullet-item';
      li.innerHTML = `<div class="bullet-dot"></div><span>${escapeHtml(text)}</span>`;
      els.summaryBullets.appendChild(li);
    });
  }

  function renderRisks(risks) {
    els.risksList.innerHTML = '';

    if (risks.length === 0) {
      els.risksList.innerHTML = `
        <div style="text-align:center;padding:24px;color:var(--muted);font-size:13px;">
          ${escapeHtml(t('no_clause'))}
        </div>`;
      return;
    }

    const order = { high: 0, medium: 1, low: 2 };
    const sorted = [...risks].sort((a, b) => (order[a.level] ?? 2) - (order[b.level] ?? 2));

    sorted.forEach(risk => {
      const card = document.createElement('div');
      card.className = `risk-card ${risk.level || 'medium'}`;
      card.innerHTML = `
        <div class="risk-header">
          <span class="risk-level-badge">${getRiskLabel(risk.level)}</span>
          <span class="risk-title">${escapeHtml(risk.title || risk.category || '')}</span>
          <svg class="risk-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="risk-body">
          ${risk.phrase ? `<div class="risk-phrase">"${escapeHtml(risk.phrase)}"</div>` : ''}
          <div class="risk-meaning">${escapeHtml(risk.meaning || risk.description || '')}</div>
          ${risk.why ? `<div class="risk-why">⚠️ ${escapeHtml(risk.why)}</div>` : ''}
        </div>
      `;

      card.querySelector('.risk-header').addEventListener('click', () => {
        card.classList.toggle('expanded');
      });

      els.risksList.appendChild(card);
    });
  }

  function renderDetail(detail) {
    if (!detail) {
      els.detailContent.innerHTML = `<div style="color:var(--muted);font-size:13px;">${escapeHtml(t('detail_empty'))}</div>`;
      return;
    }
    if (typeof detail === 'string') {
      els.detailContent.innerHTML = `<div class="detail-section"><p>${escapeHtml(detail).replace(/\n/g,'<br>')}</p></div>`;
    } else if (typeof detail === 'object') {
      els.detailContent.innerHTML = Object.entries(detail)
        .map(([title, text]) => `
          <div class="detail-section">
            <h4>${escapeHtml(title)}</h4>
            <p>${escapeHtml(text)}</p>
          </div>
        `).join('');
    }
  }

  // ── Error view ─────────────────────────────────────────────
  function showErrorView(title, message) {
    els.errorTitle.textContent   = title;
    els.errorMessage.textContent = message || t('err_default_msg');
    showView('error');
  }

  function getErrorTitle(code) {
    const map = {
      NO_CONTENT:  'err_no_content',
      NO_API_KEY:  'err_no_api_key',
      INVALID_KEY: 'err_invalid_key',
      RATE_LIMIT:  'err_rate_limit',
      API_ERROR:   'err_api_error'
    };
    return t(map[code] || 'err_default');
  }

  function getErrorMessage(code, fallback) {
    const map = {
      NO_CONTENT:  'err_no_content_msg',
      NO_API_KEY:  'err_no_api_key_msg',
      INVALID_KEY: 'err_invalid_key_msg',
      RATE_LIMIT:  'err_rate_limit_msg',
      API_ERROR:   'err_default_msg',
    };
    return map[code] ? t(map[code]) : (fallback || t('err_default_msg'));
  }

  // ── Settings helpers ───────────────────────────────────────
  function updateApiKeyHint(provider) {
    const hints = {
      gemini:    { url: 'https://aistudio.google.com/apikey',          label: 'aistudio.google.com' },
      openai:    { url: 'https://platform.openai.com/api-keys',        label: 'platform.openai.com' },
      anthropic: { url: 'https://console.anthropic.com/settings/keys', label: 'console.anthropic.com' }
    };
    const textKeys = {
      gemini:    'hint_gemini_text',
      openai:    'hint_openai_text',
      anthropic: 'hint_anthropic_text'
    };
    const hint    = hints[provider]    || hints.gemini;
    const textKey = textKeys[provider] || textKeys.gemini;
    els.apiKeyHint.innerHTML =
      `${t(textKey)} <a class="ext-link" data-url="${hint.url}">${hint.label}</a>`;
  }

  async function openSettings() {
    const config = await sendBg('GET_CONFIG').catch(() => ({}));
    els.providerSelect.value = config.provider  || 'gemini';
    els.apiKeyInput.value    = config.apiKey    || '';
    els.autoDetect.checked   = config.autoDetect !== false;
    els.languageSelect.value = config.language  || 'es';
    updateApiKeyHint(config.provider || 'gemini');
    showView('settings');
  }

  // ── Helpers ────────────────────────────────────────────────
  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function extractDomain(url) {
    try { return new URL(url).hostname.replace('www.', ''); }
    catch { return url; }
  }

  function getRiskLabel(level) {
    return { high: t('risk_high'), medium: t('risk_medium'), low: t('risk_low') }[level] || t('risk_medium');
  }

  function getDefaultVerdict(score) {
    if (score >= 70) return t('verdict_high');
    if (score >= 40) return t('verdict_medium');
    return t('verdict_low');
  }

  function relativeTime(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60)   return t('history_now');
    if (diff < 3600) return t('history_minutes').replace('{n}', Math.floor(diff / 60));
    if (diff < 86400) return t('history_hours').replace('{n}', Math.floor(diff / 3600));
    return t('history_days').replace('{n}', Math.floor(diff / 86400));
  }

  function renderHistory(history) {
    els.historyList.innerHTML = '';

    if (!history.length) {
      els.historyList.innerHTML = `
        <div class="history-empty">${escapeHtml(t('history_empty')).replace('\n', '<br>')}</div>`;
      return;
    }

    history.forEach(entry => {
      const score = entry.risk_score ?? 50;
      const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f97316' : '#10b981';

      const card = document.createElement('div');
      card.className = 'history-card';
      card.innerHTML = `
        <div class="history-score-badge" style="color:${color}">${score}</div>
        <div class="history-info">
          <div class="history-domain">${escapeHtml(entry.domain || entry.url || '—')}</div>
          <div class="history-verdict">${escapeHtml(entry.verdict || '—')}</div>
        </div>
        <div class="history-date">${relativeTime(entry.analyzedAt)}</div>
      `;

      card.addEventListener('click', () => {
        currentResult = entry.result;
        renderResults(entry.result, entry.url);
        showView('results');
      });

      els.historyList.appendChild(card);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Event listeners ────────────────────────────────────────
  els.analyzeBtn.addEventListener('click', () => startAnalysis(currentMode));
  els.explain12Btn.addEventListener('click', () => startAnalysis('simple'));

  els.newAnalysisBtn.addEventListener('click', async () => {
    await sendBg('CLEAR_STATE');
    showView('home');
  });

  els.cancelBtn.addEventListener('click', async () => {
    pollingActive = false;
    await sendBg('CANCEL_ANALYSIS').catch(() => {});
    els.analyzeBtn.disabled   = false;
    els.explain12Btn.disabled = false;
    showView('home');
  });

  els.retryBtn.addEventListener('click', () => startAnalysis(currentMode));

  els.backBtn.addEventListener('click', () => {
    els.analyzeBtn.disabled   = false;
    els.explain12Btn.disabled = false;
    sendBg('CLEAR_STATE').finally(() => showView('home'));
  });

  // Settings
  els.settingsBtn.addEventListener('click', openSettings);
  els.settingsBackBtn.addEventListener('click', () => showView('home'));

  els.providerSelect.addEventListener('change', () => {
    updateApiKeyHint(els.providerSelect.value);
  });

  els.saveSettingsBtn.addEventListener('click', async () => {
    const newLang = els.languageSelect.value;
    const newConfig = {
      provider:   els.providerSelect.value,
      apiKey:     els.apiKeyInput.value.trim(),
      autoDetect: els.autoDetect.checked,
      language:   newLang
    };
    try {
      await sendBg('SAVE_CONFIG', { config: newConfig });
      applyLanguage(newLang);
      els.settingsStatus.textContent = t('settings_saved');
      els.settingsStatus.style.color = '';
      setTimeout(() => { els.settingsStatus.textContent = ''; }, 2000);
    } catch {
      els.settingsStatus.style.color = 'var(--red)';
      els.settingsStatus.textContent = t('settings_error');
    }
  });

  // Onboarding
  els.onboardingSaveBtn.addEventListener('click', async () => {
    const key = els.onboardingKey.value.trim();
    if (!key) {
      els.obStatus.textContent = t('ob_status_empty');
      return;
    }
    els.obStatus.textContent = '';
    await sendBg('SAVE_CONFIG', { config: { provider: 'gemini', apiKey: key } });
    showView('home');
  });

  els.obOtherProviderBtn.addEventListener('click', openSettings);

  // History
  els.historyBtn.addEventListener('click', async () => {
    const history = await sendBg('GET_HISTORY').catch(() => []);
    renderHistory(history);
    showView('history');
  });

  els.historyBackBtn.addEventListener('click', () => showView('home'));

  let clearConfirmTimeout = null;
  els.clearHistoryBtn.addEventListener('click', async () => {
    if (!clearConfirmTimeout) {
      // First click: ask for confirmation
      els.clearHistoryBtn.style.color = 'var(--red)';
      els.clearHistoryBtn.title = t('history_clear_confirm');
      clearConfirmTimeout = setTimeout(() => {
        els.clearHistoryBtn.style.color = '';
        els.clearHistoryBtn.title = '';
        clearConfirmTimeout = null;
      }, 3000);
      return;
    }
    // Second click within 3s: confirm and clear
    clearTimeout(clearConfirmTimeout);
    clearConfirmTimeout = null;
    els.clearHistoryBtn.style.color = '';
    els.clearHistoryBtn.title = '';
    await sendBg('CLEAR_HISTORY').catch(() => {});
    renderHistory([]);
  });

  // ── Start ──────────────────────────────────────────────────
  await init();

})();
