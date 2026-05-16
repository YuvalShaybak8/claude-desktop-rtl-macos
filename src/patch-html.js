#!/usr/bin/env node
/* claude-desktop-rtl-mac
 * patch-html.js — inject our CSS and JS inline into an HTML file.
 *
 * Inlining (vs. <link>/<script src>) avoids any CSP, file://, or path
 * resolution issues inside the Electron renderer. The marker comments make
 * the injection idempotent: re-running cleans the previous block first.
 *
 * Usage: node patch-html.js <html-file> <css-file> <js-file>
 */

'use strict';

var fs = require('fs');

var htmlFile = process.argv[2];
var cssFile = process.argv[3];
var jsFile = process.argv[4];

if (!htmlFile || !cssFile || !jsFile) {
  console.error('Usage: patch-html.js <html-file> <css-file> <js-file>');
  process.exit(1);
}

var css = fs.readFileSync(cssFile, 'utf8');
var js = fs.readFileSync(jsFile, 'utf8');
var html = fs.readFileSync(htmlFile, 'utf8');

var START = '<!-- claude-desktop-rtl-mac:start -->';
var END = '<!-- claude-desktop-rtl-mac:end -->';

// Remove any previous injection so re-runs are idempotent.
var prevRegex = new RegExp(START + '[\\s\\S]*?' + END + '\\s*', 'g');
html = html.replace(prevRegex, '');

var block =
  START + '\n' +
  '<style data-claude-rtl-mac>\n' + css + '\n</style>\n' +
  '<script data-claude-rtl-mac>\n' + js + '\n</script>\n' +
  END + '\n';

// Prefer to inject just before </head> for predictable load order.
if (/<\/head>/i.test(html)) {
  html = html.replace(/<\/head>/i, block + '</head>');
} else if (/<body[^>]*>/i.test(html)) {
  html = html.replace(/<body[^>]*>/i, function (m) { return m + '\n' + block; });
} else {
  // Last resort: prepend.
  html = block + html;
}

fs.writeFileSync(htmlFile, html);
console.log('patched: ' + htmlFile);
