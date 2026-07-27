# TermsGuard AI

Chrome extension that analyzes Terms of Service and Privacy Policies using Claude AI.

## Project Structure

```
├── extension/          ← Chrome Extension (Manifest V3)
│   ├── manifest.json
│   ├── popup/          ← UI popup
│   ├── content/        ← DOM text extraction + highlighting
│   ├── background/     ← Service worker (orchestration)
│   └── utils/          ← Text cleaning and chunking helpers
└── backend/            ← Node.js API (calls Claude)
    ├── server.js
    ├── routes/
    ├── services/
    └── prompts/
```

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
npm install
npm start
# Server runs at http://localhost:3000
```

### 2. Extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Open the extension popup → Settings → set Backend URL to `http://localhost:3000`

## Usage

| Action | Result |
|--------|--------|
| Navigate to any Terms/Privacy page | Badge turns yellow (auto-detected) |
| Click extension icon → "Analizar" | Full AI analysis |
| "Explicar como si tuviera 12 años" | Simplified explanation for non-technical users |
| Toggle "Resaltar" | Highlights risky phrases directly on the page |

## Analysis Modes

| Mode | Description |
|------|-------------|
| Rápido | Top 3-5 risks only, fast |
| Equilibrado | Full analysis, balanced depth |
| Profundo | Maximum detail, all concerns |

## API Endpoints

```
POST /api/analyze        Single chunk analysis
POST /api/analyze/full   Full document (server-side chunking)
GET  /health             Health check
```

## Architecture

```
Browser (Content Script)
  → Background Service Worker
    → POST /api/analyze/full (backend)
      → Text chunking (if > 12,000 chars)
      → Claude API (claude-sonnet-4-6) with prompt caching
      → JSON response: risk_score, risks[], summary_bullets[]
  → Popup UI renders results
  → Content Script highlights risky phrases
```

## Privacy

- No user data stored permanently
- Page text sent to your own backend only
- No analytics, no tracking
- Analysis results stored temporarily in `chrome.storage.local` (per-tab, cleared on navigation)
