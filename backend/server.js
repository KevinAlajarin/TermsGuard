'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const analyzeRouter = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security & middleware ──────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    // Allow Chrome extensions (chrome-extension://*) and localhost
    if (!origin || origin.startsWith('chrome-extension://') || origin.includes('localhost')) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '2mb' }));

// Rate limiting: 20 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please wait a minute.' }
});

app.use('/api', limiter);

// ── Routes ─────────────────────────────────────────────────
app.use('/api', analyzeRouter);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    model: 'claude-sonnet-4-6',
    timestamp: new Date().toISOString()
  });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────
const provider = (process.env.PROVIDER || 'ollama').toLowerCase();
if (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: PROVIDER=anthropic pero ANTHROPIC_API_KEY no está configurada.');
  process.exit(1);
}
if (provider === 'ollama') {
  console.log(`Proveedor: Ollama (${process.env.OLLAMA_MODEL || 'llama3.2'}) en ${process.env.OLLAMA_URL || 'http://localhost:11434'}`);
} else {
  console.log(`Proveedor: Anthropic (${process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'})`);
}

app.listen(PORT, () => {
  console.log(`TermsGuard API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
