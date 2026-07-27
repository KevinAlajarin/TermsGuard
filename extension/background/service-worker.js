/**
 * Background Service Worker (Manifest V3)
 * Calls AI providers directly — no backend needed.
 * Supported providers: Gemini (default, free), OpenAI, Anthropic
 */

const STATE_KEY   = 'termsguard_state';
const CONFIG_KEY  = 'termsguard_config';
const HISTORY_KEY = 'termsguard_history';
const HISTORY_MAX = 5;

const abortControllers = new Map(); // tabId → AbortController

const DEFAULT_CONFIG = {
  provider:     'gemini',    // 'gemini' | 'openai' | 'anthropic'
  apiKey:       '',
  analysisMode: 'balanced',
  autoDetect:   true,
  language:     'es'         // 'es' | 'en'
};

// ── Badge management ───────────────────────────────────────
function setBadge(tabId, state) {
  const config = {
    detected:  { text: '!',  color: '#f59e0b' },
    analyzing: { text: '…',  color: '#6366f1' },
    done:      { text: '✓',  color: '#10b981' },
    error:     { text: '✕',  color: '#ef4444' },
    clear:     { text: '',   color: '#6b7280' }
  }[state] || { text: '', color: '#6b7280' };

  chrome.action.setBadgeText({ text: config.text, tabId });
  chrome.action.setBadgeBackgroundColor({ color: config.color, tabId });
}

// ── History helpers ────────────────────────────────────────
async function saveToHistory(entry) {
  const stored = await chrome.storage.local.get(HISTORY_KEY);
  const history = stored[HISTORY_KEY] || [];
  history.unshift(entry);
  await chrome.storage.local.set({ [HISTORY_KEY]: history.slice(0, HISTORY_MAX) });
}

// ── Config helpers ─────────────────────────────────────────
async function getConfig() {
  const stored = await chrome.storage.local.get(CONFIG_KEY);
  return { ...DEFAULT_CONFIG, ...(stored[CONFIG_KEY] || {}) };
}

async function saveConfig(updates) {
  const current = await getConfig();
  await chrome.storage.local.set({ [CONFIG_KEY]: { ...current, ...updates } });
}

// ── Tab state helpers ──────────────────────────────────────
async function getTabState(tabId) {
  const key = `${STATE_KEY}_${tabId}`;
  const stored = await chrome.storage.local.get(key);
  return stored[key] || null;
}

async function setTabState(tabId, state) {
  const key = `${STATE_KEY}_${tabId}`;
  await chrome.storage.local.set({ [key]: state });
}

async function clearTabState(tabId) {
  const key = `${STATE_KEY}_${tabId}`;
  await chrome.storage.local.remove(key);
}

// ── System prompt ──────────────────────────────────────────
const SYSTEM_PROMPT = `You are TermsGuard, an expert legal analyst specializing in consumer rights and digital privacy. Your role is to analyze Terms of Service, Privacy Policies, and similar legal documents on behalf of everyday users who cannot read legal text.

Your analysis must:
- Use clear, simple language (no legal jargon)
- Be neutral but critical — protect the user, not the company
- Prioritize clarity over exhaustiveness
- Identify risks without unnecessary alarmism
- Be honest about uncertainty

RESPONSE FORMAT: Always respond with a single valid JSON object. Never include markdown, code fences, or extra text outside the JSON.

JSON schema:
{
  "risk_score": <integer 0-100, where 0=very safe, 100=very dangerous>,
  "verdict": <string, 1 sentence verdict>,
  "summary_intro": <string, 2-3 sentence overview in plain language>,
  "summary_bullets": [<string>, ...],
  "risks": [
    {
      "category": <string>,
      "title": <string, short title>,
      "phrase": <string, exact quote from the text, or null>,
      "level": <"high" | "medium" | "low">,
      "meaning": <string, what this clause means for the user>,
      "why": <string, why this could be a problem>
    }
  ],
  "detail": {
    "data_collection": <string>,
    "data_sharing": <string>,
    "user_rights": <string>,
    "termination": <string>,
    "jurisdiction": <string>
  }
}

Risk scoring: 0-25 few concerns, 26-50 manageable, 51-75 be cautious, 76-100 highly problematic.

Risk categories to detect: third-party data sharing, sale of personal data, AI training use, extensive tracking, waiver of user rights, unfavorable jurisdiction, mandatory arbitration, excessive permissions, no data deletion rights, auto-renewal, unilateral changes, broad IP ownership of user content.`;

// ── Prompt builders ────────────────────────────────────────
function buildPrompt({ text, appLanguage, mode, chunkIndex, totalChunks }) {
  const langNote = appLanguage === 'es'
    ? 'IMPORTANT: Write your entire JSON response in Spanish. All text values (verdict, summary, risks, detail) must be in Spanish, regardless of the document\'s language.'
    : 'IMPORTANT: Write your entire JSON response in English. All text values (verdict, summary, risks, detail) must be in English, regardless of the document\'s language.';

  const modeNote = {
    quick:    'Focus on the top 3-5 most critical risks only. Be concise.',
    balanced: 'Provide a thorough but focused analysis.',
    deep:     'Provide maximum depth — identify every potential concern, no matter how minor.',
    simple:   'Explain this to a 12-year-old. Use extremely simple words, short sentences, and relatable analogies.'
  }[mode] || '';

  const chunkNote = totalChunks > 1
    ? `\n\nNOTE: This is chunk ${chunkIndex + 1} of ${totalChunks}. Analyze only this portion.`
    : '';

  return `${langNote} ${modeNote}${chunkNote}\n\nAnalyze the following legal document and respond with valid JSON only:\n\n---\n${text}\n---`;
}

function buildConsolidationPrompt({ partial_results, appLanguage, mode }) {
  const langNote = appLanguage === 'es'
    ? 'Respond in Spanish. All text in the consolidated JSON must be in Spanish.'
    : 'Respond in English. All text in the consolidated JSON must be in English.';
  return `${langNote} Consolidate these partial analyses of the same legal document into one coherent result. Deduplicate risks, compute a final risk_score, and write unified summaries.\n\nPartial results:\n${JSON.stringify(partial_results, null, 2)}\n\nRespond with consolidated JSON using the same schema.`;
}

// ── AI Provider calls ──────────────────────────────────────
async function callGemini(prompt, apiKey, signal) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
      })
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const status = res.status;
    if (status === 400 || status === 403) {
      throw Object.assign(new Error('Gemini: invalid key or no permissions'), { code: 'INVALID_KEY' });
    }
    if (status === 429) {
      throw Object.assign(new Error('Gemini: rate limit exceeded'), { code: 'RATE_LIMIT' });
    }
    throw new Error(err.error?.message || `Gemini error ${status}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function callOpenAI(prompt, apiKey, signal) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    signal,
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 4096,
      temperature: 0.1,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: prompt }
      ]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const status = res.status;
    if (status === 401) {
      throw Object.assign(new Error('OpenAI: invalid key'), { code: 'INVALID_KEY' });
    }
    if (status === 429) {
      throw Object.assign(new Error('OpenAI: rate limit exceeded'), { code: 'RATE_LIMIT' });
    }
    throw new Error(err.error?.message || `OpenAI error ${status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content;
}

async function callAnthropic(prompt, apiKey, signal) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    signal,
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const status = res.status;
    if (status === 401) {
      throw Object.assign(new Error('Anthropic: invalid key'), { code: 'INVALID_KEY' });
    }
    if (status === 429) {
      throw Object.assign(new Error('Anthropic: rate limit exceeded'), { code: 'RATE_LIMIT' });
    }
    throw new Error(err.error?.message || `Anthropic error ${status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text;
}

async function callAI(prompt, config, signal) {
  if (!config.apiKey) {
    throw Object.assign(new Error('No API key configured'), { code: 'NO_API_KEY' });
  }
  switch (config.provider) {
    case 'gemini':    return callGemini(prompt, config.apiKey, signal);
    case 'openai':    return callOpenAI(prompt, config.apiKey, signal);
    case 'anthropic': return callAnthropic(prompt, config.apiKey, signal);
    default: throw new Error(`Unknown provider: ${config.provider}`);
  }
}

async function callAIWithRetry(prompt, config, signal, retries = 2, delayMs = 4000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await callAI(prompt, config, signal);
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (err.code === 'RATE_LIMIT' && attempt < retries) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, delayMs * (attempt + 1));
          signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
          }, { once: true });
        });
        continue;
      }
      throw err;
    }
  }
}

// ── JSON parsing ───────────────────────────────────────────
function parseAIResponse(rawText) {
  if (!rawText) throw new Error('Empty AI response');

  let clean = rawText.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return validateAndNormalize(JSON.parse(clean));
  } catch {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try { return validateAndNormalize(JSON.parse(match[0])); } catch {}
    }
    throw new Error('Could not parse AI response. Please try again.');
  }
}

function validateAndNormalize(data) {
  return {
    risk_score:      clamp(parseInt(data.risk_score) || 50, 0, 100),
    verdict:         String(data.verdict || ''),
    summary_intro:   String(data.summary_intro || data.summary || ''),
    summary_bullets: Array.isArray(data.summary_bullets) ? data.summary_bullets.map(String) : [],
    risks:           normalizeRisks(data.risks),
    detail:          normalizeDetail(data.detail)
  };
}

function normalizeRisks(risks) {
  if (!Array.isArray(risks)) return [];
  return risks.map(r => ({
    category: String(r.category || ''),
    title:    String(r.title || r.category || ''),
    phrase:   r.phrase ? String(r.phrase) : null,
    level:    ['high', 'medium', 'low'].includes(r.level) ? r.level : 'medium',
    meaning:  String(r.meaning || r.description || ''),
    why:      String(r.why || r.reason || '')
  }));
}

function normalizeDetail(detail) {
  if (!detail || typeof detail !== 'object') {
    return typeof detail === 'string' ? detail : '';
  }
  return detail;
}

function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

// ── Text chunking ──────────────────────────────────────────
function splitByWords(text, maxChars) {
  const words = text.split(/\s+/);
  const parts = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    if (candidate.length > maxChars && current.length > 0) {
      parts.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function chunkText(text, maxChars = 10000, overlap = 500) {
  if (text.length <= maxChars) return [text];

  // Split on any newline (single or double) — many pages use \n only
  const lines = text.split(/\n+/).filter(l => l.trim().length > 0);
  const chunks = [];
  let current = '';

  for (const line of lines) {
    // If a single line exceeds maxChars, split it further by words
    const segments = line.length > maxChars ? splitByWords(line, maxChars) : [line];

    for (const seg of segments) {
      const candidate = current ? current + '\n' + seg : seg;
      if (candidate.length > maxChars && current.length > 0) {
        chunks.push(current.trim());
        current = current.slice(-overlap) + '\n' + seg;
      } else {
        current = candidate;
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ── AI Analysis ────────────────────────────────────────────
async function analyzeWithAI(extractedData, mode, config, signal) {
  const appLanguage = config.language || 'es';
  const chunks = chunkText(extractedData.text);

  if (chunks.length === 1) {
    const prompt = buildPrompt({ text: chunks[0], appLanguage, mode, chunkIndex: 0, totalChunks: 1 });
    const raw = await callAIWithRetry(prompt, config, signal);
    return parseAIResponse(raw);
  }

  // Multi-chunk: sequential with pause between requests to avoid rate limits
  const chunkResults = [];
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 2000);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      });
    }
    const prompt = buildPrompt({ text: chunks[i], appLanguage, mode, chunkIndex: i, totalChunks: chunks.length });
    const raw = await callAIWithRetry(prompt, config, signal);
    chunkResults.push(parseAIResponse(raw));
  }

  const consolPrompt = buildConsolidationPrompt({ partial_results: chunkResults, appLanguage, mode });
  const raw = await callAIWithRetry(consolPrompt, config, signal);
  return parseAIResponse(raw);
}

// ── Main analysis flow ─────────────────────────────────────
async function runAnalysis(tabId, mode) {
  const existing = await getTabState(tabId);
  if (existing?.status === 'analyzing') return;

  const config = await getConfig();

  if (!config.apiKey) {
    await setTabState(tabId, {
      status: 'error',
      error: 'Configura una API key para comenzar.',
      errorCode: 'NO_API_KEY'
    });
    setBadge(tabId, 'clear');
    return;
  }

  await setTabState(tabId, { status: 'analyzing', progress: 0 });
  setBadge(tabId, 'analyzing');

  const controller = new AbortController();
  abortControllers.set(tabId, controller);

  try {
    const [extractResult] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const NOISE_SEL = [
          'nav','header','footer','aside','script','style','noscript',
          'iframe','form','button','[role="navigation"]','[role="banner"]',
          '.nav','.header','.footer','.sidebar','.menu','.advertisement','.ad'
        ];
        const clone = document.documentElement.cloneNode(true);
        NOISE_SEL.forEach(s => clone.querySelectorAll(s).forEach(e => e.remove()));

        const mainSel = ['main','article','[role="main"]','.content','#content','#main','.terms','.privacy','.legal'];
        let target = null;
        for (const s of mainSel) {
          const el = clone.querySelector(s);
          if (el?.textContent?.trim().length > 500) { target = el; break; }
        }
        const src = target || clone.querySelector('body') || clone;
        let text = (src.innerText || src.textContent || '')
          .replace(/\t/g,' ').replace(/[ \t]+/g,' ')
          .replace(/\n{3,}/g,'\n\n').replace(/^\s+|\s+$/gm,'').trim();
        const lines = text.split('\n').filter(l => l.trim().length > 3);
        text = lines.join('\n');
        const sample = text.slice(0,500).toLowerCase();
        const esWords = ['términos','condiciones','privacidad','datos','usuario'];
        const isEs = esWords.filter(w => sample.includes(w)).length >= 2;
        return { text, wordCount: text.split(/\s+/).length, charCount: text.length,
                 url: location.href, title: document.title, language: isEs ? 'es' : 'en' };
      }
    });

    const extracted = extractResult.result;

    if (!extracted || extracted.charCount < 200) {
      throw Object.assign(
        new Error('Not enough content to analyze'),
        { code: 'NO_CONTENT' }
      );
    }

    await setTabState(tabId, { status: 'analyzing', progress: 30 });

    const result = await analyzeWithAI(extracted, mode, config, controller.signal);

    await setTabState(tabId, {
      status: 'done',
      progress: 100,
      result,
      analyzedAt: Date.now(),
      url: extracted.url,
      title: extracted.title,
      wordCount: extracted.wordCount
    });

    abortControllers.delete(tabId);
    setBadge(tabId, 'done');

    let domain = extracted.url;
    try { domain = new URL(extracted.url).hostname.replace('www.', ''); } catch {}
    saveToHistory({
      url:        extracted.url,
      domain,
      title:      extracted.title,
      risk_score: result.risk_score,
      verdict:    result.verdict,
      analyzedAt: Date.now(),
      result
    }).catch(() => {});

  } catch (err) {
    abortControllers.delete(tabId);
    if (err.name === 'AbortError') return; // cancelled by user — state already cleared
    const errorCode = err.code || 'API_ERROR';
    await setTabState(tabId, { status: 'error', error: err.message, errorCode });
    setBadge(tabId, 'error');
  }
}

// ── Message router ─────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = message.tabId || sender.tab?.id;

  switch (message.action) {

    case 'LEGAL_PAGE_DETECTED': {
      if (!tabId) break;
      getConfig().then(config => {
        if (config.autoDetect) setBadge(tabId, 'detected');
      });
      break;
    }

    case 'START_ANALYSIS': {
      if (!tabId) { sendResponse({ error: 'No tab ID' }); break; }
      runAnalysis(tabId, message.mode || 'balanced')
        .then(() => sendResponse({ ok: true }))
        .catch(e => sendResponse({ error: e.message }));
      return true;
    }

    case 'GET_STATE': {
      if (!tabId) { sendResponse(null); break; }
      getTabState(tabId)
        .then(state => sendResponse(state))
        .catch(() => sendResponse(null));
      return true;
    }

    case 'GET_CONFIG': {
      getConfig()
        .then(c => sendResponse(c))
        .catch(() => sendResponse(DEFAULT_CONFIG));
      return true;
    }

    case 'SAVE_CONFIG': {
      saveConfig(message.config)
        .then(() => sendResponse({ ok: true }))
        .catch(e => sendResponse({ error: e.message }));
      return true;
    }

    case 'GET_HISTORY': {
      chrome.storage.local.get(HISTORY_KEY)
        .then(stored => sendResponse(stored[HISTORY_KEY] || []))
        .catch(() => sendResponse([]));
      return true;
    }

    case 'CANCEL_ANALYSIS': {
      const controller = abortControllers.get(tabId);
      if (controller) {
        controller.abort();
        abortControllers.delete(tabId);
      }
      clearTabState(tabId).catch(() => {});
      setBadge(tabId, 'clear');
      sendResponse({ ok: true });
      break;
    }

    case 'CLEAR_HISTORY': {
      chrome.storage.local.remove(HISTORY_KEY)
        .then(() => sendResponse({ ok: true }))
        .catch(e => sendResponse({ error: e.message }));
      return true;
    }

    case 'CLEAR_STATE': {
      if (!tabId) break;
      clearTabState(tabId)
        .then(() => { setBadge(tabId, 'clear'); sendResponse({ ok: true }); })
        .catch(e => sendResponse({ error: e.message }));
      return true;
    }

    default:
      sendResponse({ error: 'Unknown action' });
  }
  return true;
});

// ── Tab lifecycle ──────────────────────────────────────────
chrome.tabs.onRemoved.addListener(tabId => {
  const controller = abortControllers.get(tabId);
  if (controller) {
    controller.abort();
    abortControllers.delete(tabId);
  }
  clearTabState(tabId).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    setBadge(tabId, 'clear');
    clearTabState(tabId).catch(() => {});
  }
});
