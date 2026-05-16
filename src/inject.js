/* claude-desktop-rtl-mac
 * Dynamic dir="auto" injector
 *
 * The CSS handles most cases via `unicode-bidi: plaintext`. This script is
 * belt-and-suspenders: it adds the HTML `dir="auto"` attribute to text
 * containers as they're rendered, which can produce nicer behavior in edge
 * cases (alignment of inline elements, copy/paste, etc.).
 *
 * Performance: the MutationObserver is scoped to subtree of body and only
 * processes newly added element nodes. setAttribute is a no-op if the
 * attribute is already correct.
 */

(function () {
  'use strict';

  // Selectors that should get dir="auto"
  var SELECTORS = [
    '.font-claude-message',
    '.font-claude-response',
    '.font-user-message',
    '[class*="message-content"]',
    '[class*="MessageContent"]',
    '.prose',
    '[class*="prose"]',
    'textarea',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '.ProseMirror',
  ].join(',');

  // Elements where we never want auto direction (code stays LTR)
  var CODE_SELECTORS = 'pre, code, .hljs, [class*="code-block"], [class*="CodeBlock"]';

  function isCodeContext(el) {
    return el.closest && el.closest(CODE_SELECTORS);
  }

  function applyTo(el) {
    if (!el || el.nodeType !== 1) return;
    if (isCodeContext(el)) return;
    if (el.getAttribute('dir') === 'auto') return;
    el.setAttribute('dir', 'auto');
  }

  function applyDirAuto(root) {
    if (!root || !root.querySelectorAll) return;

    try {
      if (root.matches && root.matches(SELECTORS)) {
        applyTo(root);
      }
      var matches = root.querySelectorAll(SELECTORS);
      for (var i = 0; i < matches.length; i++) {
        applyTo(matches[i]);
      }
    } catch (e) {
      // Don't crash the host app under any circumstances
      console.warn('[claude-desktop-rtl-mac]', e);
    }
  }

  function init() {
    applyDirAuto(document.body);

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) {
            applyDirAuto(m.addedNodes[j]);
          }
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log('[claude-desktop-rtl-mac] initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
