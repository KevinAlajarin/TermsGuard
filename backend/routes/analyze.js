'use strict';

const { Router } = require('express');
const { analyzeText, consolidateResults } = require('../services/aiService');
const { chunkText } = require('../services/chunker');

const router = Router();

/**
 * POST /api/analyze
 *
 * Body (single document):
 *   { text, url, title, language, mode }
 *
 * Body (single chunk of multi-chunk doc):
 *   { text, url, title, language, mode, chunkIndex, totalChunks }
 *
 * Body (consolidation request):
 *   { consolidate: true, partial_results, url, title, language, mode }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { text, url, title, language, mode, chunkIndex, totalChunks, consolidate, partial_results } = req.body;

    // Consolidation pass for multi-chunk docs
    if (consolidate && Array.isArray(partial_results)) {
      const result = await consolidateResults({ partial_results, url, title, language, mode });
      return res.json(result);
    }

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ message: 'Missing or invalid text field' });
    }

    if (text.trim().length < 100) {
      return res.status(400).json({ message: 'Text too short to analyze (minimum 100 characters)' });
    }

    const result = await analyzeText({
      text,
      url: url || '',
      title: title || '',
      language: language || 'en',
      mode: mode || 'balanced',
      chunkIndex: chunkIndex ?? 0,
      totalChunks: totalChunks ?? 1
    });

    res.json(result);

  } catch (err) {
    console.error('[analyze] Error:', err.message);

    if (err.status === 401 || err.message?.includes('API key')) {
      return res.status(401).json({ message: 'Invalid or missing API key' });
    }
    if (err.status === 429) {
      return res.status(429).json({ message: 'Rate limit reached. Please wait a moment.' });
    }
    if (err.message === 'Could not parse AI response as JSON') {
      return res.status(502).json({ message: 'AI response was malformed. Try again.' });
    }

    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/analyze/full
 * Convenience endpoint: handles chunking server-side.
 * Accepts full text, chunks it, calls AI, consolidates, returns single result.
 */
router.post('/analyze/full', async (req, res) => {
  try {
    const { text, url, title, language, mode } = req.body;

    if (!text || text.trim().length < 100) {
      return res.status(400).json({ message: 'Missing or too-short text' });
    }

    const chunks = chunkText(text);

    if (chunks.length === 1) {
      const result = await analyzeText({ text: chunks[0], url, title, language, mode, chunkIndex: 0, totalChunks: 1 });
      return res.json(result);
    }

    // Process all chunks in parallel
    const partialResults = await Promise.all(
      chunks.map((chunk, i) =>
        analyzeText({ text: chunk, url, title, language, mode, chunkIndex: i, totalChunks: chunks.length })
      )
    );

    const consolidated = await consolidateResults({ partial_results: partialResults, url, title, language, mode });
    res.json(consolidated);

  } catch (err) {
    console.error('[analyze/full] Error:', err.message);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

module.exports = router;
