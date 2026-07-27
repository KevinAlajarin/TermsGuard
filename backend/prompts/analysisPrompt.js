'use strict';

/**
 * Builds prompts for legal document analysis.
 * The system prompt is stable → ideal for Claude's prompt caching.
 */

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
  "verdict": <string, 1 sentence verdict in the document's language>,
  "summary_intro": <string, 2-3 sentence overview in plain language>,
  "summary_bullets": [<string>, ...],  // 5-8 key points, plain language
  "risks": [
    {
      "category": <string, risk category name>,
      "title": <string, short title>,
      "phrase": <string, exact or near-exact quote from the text that is problematic, or null>,
      "level": <"high" | "medium" | "low">,
      "meaning": <string, what this clause actually means for the user>,
      "why": <string, why this could be a problem>
    }
  ],
  "detail": {
    "data_collection": <string, what data they collect>,
    "data_sharing": <string, who they share data with>,
    "user_rights": <string, what rights the user has>,
    "termination": <string, account/service termination terms>,
    "jurisdiction": <string, which laws apply and where>
  }
}

Risk scoring guide:
- 0-25: Few or minor concerns, standard terms
- 26-50: Some concerning clauses but manageable
- 51-75: Multiple significant risks, user should be cautious
- 76-100: Highly problematic terms, consider not accepting

Risk categories to detect (not limited to):
- Third-party data sharing
- Sale of personal data
- Use of data for AI training
- Extensive tracking/monitoring
- Waiver of user rights
- Unfavorable jurisdiction
- Mandatory arbitration (no lawsuits allowed)
- Excessive permissions
- No data deletion rights
- Auto-renewal without notice
- Unilateral changes without notification
- Broad IP ownership of user content`;

function buildAnalysisPrompt({ text, language, mode, chunkIndex, totalChunks }) {
  const isPartial = totalChunks > 1;
  const langNote = language === 'es'
    ? 'The document appears to be in Spanish. Respond in Spanish.'
    : 'Respond in English.';

  const modeNote = {
    quick: 'Focus on the top 3-5 most critical risks only. Be concise.',
    balanced: 'Provide a thorough but focused analysis.',
    deep: 'Provide maximum depth — identify every potential concern, no matter how minor.',
    simple: 'Imagine explaining this to a 12-year-old. Use extremely simple words, short sentences, and relatable analogies.'
  }[mode] || '';

  const chunkNote = isPartial
    ? `\n\nNOTE: This is chunk ${chunkIndex + 1} of ${totalChunks} of the full document. Analyze only this portion and include all findings — they will be consolidated later.`
    : '';

  return `${langNote} ${modeNote}${chunkNote}

Analyze the following legal document text and respond with the JSON schema described in the system prompt:

---
${text}
---`;
}

function buildConsolidationPrompt({ partial_results, language, mode }) {
  const langNote = language === 'es'
    ? 'Respond in Spanish.'
    : 'Respond in English.';

  return `${langNote} You have received partial analysis results from multiple chunks of the same legal document. Consolidate them into a single, coherent analysis.

Deduplicate risks (keep the most severe version if duplicated), compute a final risk_score, and write unified summary_bullets and detail sections.

Partial results:
${JSON.stringify(partial_results, null, 2)}

Respond with the consolidated JSON using the same schema.`;
}

module.exports = { SYSTEM_PROMPT, buildAnalysisPrompt, buildConsolidationPrompt };
