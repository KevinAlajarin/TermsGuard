'use strict';

const { SYSTEM_PROMPT, buildAnalysisPrompt, buildConsolidationPrompt } = require('../prompts/analysisPrompt');

const PROVIDER = (process.env.PROVIDER || 'ollama').toLowerCase();

// ── Provider: Anthropic Claude ─────────────────────────────
async function callAnthropic(userPrompt) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: userPrompt }]
  });

  return message.content[0]?.text;
}

// ── Provider: Ollama (local) ───────────────────────────────
async function callOllama(userPrompt) {
  const model = process.env.OLLAMA_MODEL || 'llama3.2';
  const baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: 0.1, num_predict: 4096 },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userPrompt }
      ]
    })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 404) {
      throw new Error(`Ollama model "${model}" not found. Run: ollama pull ${model}`);
    }
    throw new Error(`Ollama error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.message?.content;
}

// ── Router ─────────────────────────────────────────────────
async function callAI(userPrompt) {
  if (PROVIDER === 'anthropic') return callAnthropic(userPrompt);
  if (PROVIDER === 'ollama')    return callOllama(userPrompt);
  throw new Error(`Unknown PROVIDER: "${PROVIDER}". Use "ollama" or "anthropic".`);
}

// ── Public API ─────────────────────────────────────────────
async function analyzeText({ text, url, title, language, mode, chunkIndex, totalChunks }) {
  const prompt = buildAnalysisPrompt({ text, language, mode, chunkIndex, totalChunks });
  const raw = await callAI(prompt);
  return parseAIResponse(raw);
}

async function consolidateResults({ partial_results, url, title, language, mode }) {
  const prompt = buildConsolidationPrompt({ partial_results, language, mode });
  const raw = await callAI(prompt);
  return parseAIResponse(raw);
}

// ── JSON parser ────────────────────────────────────────────
function parseAIResponse(rawText) {
  if (!rawText) throw new Error('Empty response from AI');

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
    throw new Error('Could not parse AI response as JSON');
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

module.exports = { analyzeText, consolidateResults };
