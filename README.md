# claude-desktop-rtl-mac

RTL & bidirectional text support for [Claude Desktop](https://claude.ai/download) on **macOS**.

If you write in Hebrew or any other right-to-left language, this patch makes Claude Desktop render your text — and Claude's replies — in the correct direction.

> A macOS counterpart to existing Windows-only solutions for the same problem.

---

## What it does

- Detects message direction automatically based on the first strong character of each paragraph (Unicode UAX #9 / HTML `dir="auto"` behavior).
- Hebrew/Arabic paragraphs render right-aligned and right-to-left.
- English/Latin paragraphs are untouched and stay LTR.
- Mixed-direction documents (e.g. Hebrew with English technical terms) are handled correctly.
- Code blocks always stay LTR — even if they contain RTL comments.

## How it works

Claude Desktop is an Electron app. The patch:

1. Backs up the original `app.asar`.
2. Extracts it, injects a small CSS + JS block into the renderer's `index.html`, and repacks it.
3. Re-signs the app with an ad-hoc signature so macOS will run it.

The CSS leverages `unicode-bidi: plaintext`; the JS adds `dir="auto"` to message containers as they're rendered. Both are safe for LTR-only users.

## Requirements

- macOS (Apple Silicon or Intel)
- [Claude Desktop](https://claude.ai/download) installed in `/Applications` or `~/Applications`
- [Node.js](https://nodejs.org) ≥ 16 (`brew install node`)
- Admin password (to write into `/Applications`)

## Install

```bash
git clone https://github.com/YuvalShaybak8/claude-desktop-rtl-macos.git
cd claude-desktop-rtl-macos
chmod +x install.sh uninstall.sh
./install.sh
```

Then quit Claude Desktop completely (⌘Q) and reopen it.

## Uninstall

```bash
./uninstall.sh
```

This restores the original `app.asar` from the backup created during install.

## Updates

Claude Desktop auto-updates itself periodically. Each update overwrites this patch. After Claude updates, just re-run `./install.sh` — it's idempotent and fast.

## Troubleshooting

**"Claude.app is damaged and can't be opened"** — re-run `./install.sh`. The re-sign step at the end fixes this; if it was interrupted it may need to run again.

**The patch installs cleanly but RTL doesn't appear** — Claude Desktop's DOM might have changed. Open Claude Desktop, then open DevTools (View → Developer → Toggle Developer Tools, if available, or with a `--remote-debugging-port` launch). Look at the class names of message containers and update `src/rtl.css` to match. PRs welcome.

**It used to work, now it doesn't** — Claude Desktop probably auto-updated. Re-run `./install.sh`.

## Caveats

- This modifies the Claude Desktop app bundle. The original signature is replaced with an ad-hoc signature.
- Backed up safely to `app.asar.original` and reversible at any time via `./uninstall.sh`.
- Not affiliated with Anthropic.

## License

MIT. See `LICENSE`.

---

<div dir="rtl">

# claude-desktop-rtl-mac (עברית)

תמיכת RTL ו-bidi עבור [Claude Desktop](https://claude.ai/download) ב-**macOS**.

אם אתה כותב בעברית או בערבית, התיקון הזה גורם ל-Claude Desktop להציג את הטקסט שלך — ואת התשובות של Claude — בכיוון הנכון.

> זהו פתרון macOS מקביל לפתרונות Windows קיימים לאותה בעיה.

## מה זה עושה

- מזהה אוטומטית את כיוון הפסקה לפי התו החזק הראשון שלה.
- פסקאות בעברית/ערבית: מיושרות לימין, בכיוון RTL.
- פסקאות באנגלית/לטינית: נשארות כפי שהן (LTR).
- טקסט מעורב מטופל נכון.
- בלוקי קוד תמיד נשארים LTR, גם אם יש בהם הערות בעברית.

## איך זה עובד

Claude Desktop היא אפליקציית Electron. הסקריפט:

1. מגבה את `app.asar` המקורי.
2. מחלץ אותו, מזריק בלוק CSS + JS קטן ל-`index.html` של ה-renderer, ואורז מחדש.
3. חותם מחדש על האפליקציה עם חתימה ad-hoc כדי ש-macOS יסכים להריץ אותה.

## דרישות

- macOS (Apple Silicon או Intel)
- [Claude Desktop](https://claude.ai/download) מותקן ב-`/Applications` או `~/Applications`
- [Node.js](https://nodejs.org) ≥ 16
- סיסמת admin (כדי לכתוב לתוך `/Applications`)

## התקנה

```bash
git clone https://github.com/YuvalShaybak8/claude-desktop-rtl-macos.git
cd claude-desktop-rtl-macos
chmod +x install.sh uninstall.sh
./install.sh
```

אחר כך לסגור את Claude Desktop לחלוטין (⌘Q) ולפתוח מחדש.

## הסרה

```bash
./uninstall.sh
```

## עדכונים

Claude Desktop מתעדכן אוטומטית מעת לעת. כל עדכון מוחק את התיקון. אחרי עדכון, פשוט הרץ שוב `./install.sh`.

## הצהרה

הפרויקט הזה אינו מסונף ל-Anthropic.

</div>
