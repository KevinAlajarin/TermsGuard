'use strict';

const MAX_CHUNK_CHARS = 12000;
const OVERLAP_CHARS = 800;

/**
 * Splits long text into overlapping chunks on paragraph boundaries.
 * Returns an array of chunk strings.
 */
function chunkText(text, maxChars = MAX_CHUNK_CHARS, overlap = OVERLAP_CHARS) {
  if (text.length <= maxChars) return [text];

  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    const candidate = current ? current + '\n\n' + para : para;
    if (candidate.length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = current.slice(-overlap) + '\n\n' + para;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

module.exports = { chunkText };
