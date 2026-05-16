(function () {
  'use strict';

  if (typeof document === 'undefined') return;
  if (window.__CLAUDE_DESKTOP_RTL_MAC__) return;
  window.__CLAUDE_DESKTOP_RTL_MAC__ = true;

  var TEXT_SELECTOR = [
    'p',
    'li',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'td',
    'th',
    'summary',
    'label',
    'dt',
    'dd',
  ].join(',');

  var INPUT_SELECTOR = [
    '[data-testid="chat-input"]',
    'textarea',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '.ProseMirror',
  ].join(',');

  var CODE_SELECTOR = [
    'pre',
    'code',
    '.hljs',
    '.code-block__code',
    '[class*="code-block"]',
    '[class*="CodeBlock"]',
  ].join(',');

  function isRtlChar(ch) {
    var code = ch.charCodeAt(0);
    return (
      (code >= 0x0590 && code <= 0x05ff) ||
      (code >= 0x0600 && code <= 0x06ff) ||
      (code >= 0x0750 && code <= 0x077f) ||
      (code >= 0x08a0 && code <= 0x08ff)
    );
  }

  function firstStrongDirection(text) {
    if (!text) return null;

    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i);
      if (isRtlChar(ch)) return 'rtl';
      if (/[A-Za-z]/.test(ch)) return 'ltr';
    }

    return null;
  }

  function hasRtl(text) {
    if (!text) return false;

    for (var i = 0; i < text.length; i++) {
      if (isRtlChar(text.charAt(i))) return true;
    }

    return false;
  }

  function qsa(root, selector) {
    var base = root && root.querySelectorAll ? root : document;
    var result = Array.prototype.slice.call(base.querySelectorAll(selector));

    if (root && root.matches && root.matches(selector)) {
      result.unshift(root);
    }

    return result;
  }

  function textWithoutCode(el) {
    var out = '';
    var nodes = el.childNodes || [];

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];

      if (node.nodeType === 3) {
        out += node.textContent || '';
      } else if (node.nodeType === 1 && !node.matches(CODE_SELECTOR)) {
        out += textWithoutCode(node);
      }
    }

    return out;
  }

  function stripLeadingLtrNoise(text) {
    return (text || '')
      .replace(/^\s*(?:[\w.-]+\.[\w]{1,8})\s*/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[\w.-]+[\\/][\w./\\-]+/g, '')
      .replace(/`[^`]+`/g, '');
  }

  function detectTextDirection(text) {
    if (!text || !text.trim()) return null;

    var dir = firstStrongDirection(text);
    if (dir === 'rtl') return 'rtl';
    if (!hasRtl(text)) return 'ltr';

    dir = firstStrongDirection(stripLeadingLtrNoise(text));
    if (dir === 'rtl') return 'rtl';

    return 'rtl';
  }

  function detectElementDirection(el) {
    var text = textWithoutCode(el);
    if (!text || !hasRtl(text)) return null;

    return detectTextDirection(text);
  }

  function clearDirection(el) {
    el.removeAttribute('dir');
    el.removeAttribute('data-claude-rtl-dir');
    el.style.direction = '';
    el.style.textAlign = '';
    el.style.unicodeBidi = '';

    if (el.tagName === 'LI') {
      el.style.listStylePosition = '';
    }
  }

  function applyDirection(el, dir) {
    if (!dir) {
      clearDirection(el);
      return;
    }

    el.setAttribute('dir', dir);
    el.setAttribute('data-claude-rtl-dir', dir);
    el.style.direction = dir;
    el.style.textAlign = 'start';
    el.style.unicodeBidi = 'plaintext';

    if (el.tagName === 'LI' && dir === 'rtl') {
      el.style.listStylePosition = 'inside';
    }
  }

  function forceCodeLtr(root) {
    qsa(root, CODE_SELECTOR).forEach(function (el) {
      el.setAttribute('dir', 'ltr');
      el.style.direction = 'ltr';
      el.style.textAlign = 'left';
      el.style.unicodeBidi = el.tagName === 'CODE' ? 'isolate' : 'embed';
    });
  }

  function processText(root) {
    qsa(root, TEXT_SELECTOR).forEach(function (el) {
      if (el.closest(INPUT_SELECTOR) || el.closest(CODE_SELECTOR)) return;

      var dir = detectElementDirection(el);
      applyDirection(el, dir);
    });

    qsa(root, 'ul, ol').forEach(function (list) {
      if (list.closest(INPUT_SELECTOR) || list.closest(CODE_SELECTOR)) return;

      var dir = detectElementDirection(list);
      if (dir === 'rtl') {
        list.setAttribute('dir', 'rtl');
        list.setAttribute('data-claude-rtl-dir', 'rtl');
        list.style.direction = 'rtl';

        var paddingLeft = getComputedStyle(list).paddingLeft;
        if (parseFloat(paddingLeft) > 0) {
          list.style.paddingRight = paddingLeft;
          list.style.paddingLeft = '0';
        }
      } else {
        list.removeAttribute('dir');
        list.removeAttribute('data-claude-rtl-dir');
        list.style.direction = '';
        list.style.paddingRight = '';
        list.style.paddingLeft = '';
      }
    });
  }

  function processInput(root) {
    qsa(root, INPUT_SELECTOR).forEach(function (input) {
      var text = input.value || input.textContent || input.innerText || '';
      var dir = detectTextDirection(text);

      if (dir === 'rtl') {
        input.setAttribute('dir', 'rtl');
        input.style.direction = 'rtl';
        input.style.textAlign = 'right';
      } else {
        input.setAttribute('dir', 'ltr');
        input.style.direction = 'ltr';
        input.style.textAlign = 'left';
      }
    });
  }

  function processRoot(root) {
    try {
      forceCodeLtr(root);
      processText(root);
      processInput(root);
    } catch (error) {
      console.warn('[claude-desktop-rtl-mac]', error);
    }
  }

  function scheduleProcess(root) {
    if (window.__CLAUDE_DESKTOP_RTL_MAC_TIMER__) return;

    window.__CLAUDE_DESKTOP_RTL_MAC_TIMER__ = setTimeout(function () {
      window.__CLAUDE_DESKTOP_RTL_MAC_TIMER__ = null;
      processRoot(root || document.body);
    }, 50);
  }

  function init() {
    if (!document.body) return;

    processRoot(document.body);

    document.addEventListener(
      'input',
      function (event) {
        if (!event.target) return;
        processInput(event.target);
      },
      true
    );

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var mutation = mutations[i];

        if (
          mutation.type === 'characterData' ||
          (mutation.type === 'childList' && mutation.addedNodes.length > 0)
        ) {
          scheduleProcess(document.body);
          return;
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    console.log('[claude-desktop-rtl-mac] initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
