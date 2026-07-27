/**
 * Content script — runs in the context of every page.
 * Detects legal pages and notifies the background service worker.
 */

(function () {
  'use strict';

  const LEGAL_PATTERNS = [
    /terms[\s\-_]*(of[\s\-_]*)?(service|use|conditions?)?/i,
    /privacy[\s\-_]*(policy|notice)?/i,
    /cookie[\s\-_]*policy/i,
    /user[\s\-_]*agreement/i,
    /términos[\s\-_]*(y[\s\-_]*)?(condiciones?|servicio|uso)?/i,
    /política[\s\-_]*(de[\s\-_]*)?(privacidad|cookies|datos)?/i,
    /aviso[\s\-_]*legal/i,
    /legal[\s\-_]*notice/i,
    /end[\s\-_]*user[\s\-_]*license/i,
    /eula/i
  ];

  function isLegalPage() {
    const checks = [
      document.title,
      window.location.href,
      document.querySelector('h1')?.textContent || '',
      document.querySelector('h2')?.textContent || ''
    ];
    return checks.some(text => LEGAL_PATTERNS.some(p => p.test(text)));
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'CHECK_LEGAL_PAGE') {
      sendResponse({ isLegal: isLegalPage() });
    }
    return true;
  });

  if (isLegalPage()) {
    chrome.runtime.sendMessage({
      action: 'LEGAL_PAGE_DETECTED',
      url: window.location.href,
      title: document.title
    }).catch(() => {});
  }
})();
