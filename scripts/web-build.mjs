// Bereitet die Web-App vor: kopiert die Bibliotheken aus node_modules nach www/lib.
// Wird von GitHub Actions (APK + GitHub Pages) und von Cloudflare (Build-Befehl) genutzt.
import { mkdirSync, copyFileSync, existsSync, cpSync } from 'node:fs';
const libs = [
  ['node_modules/jsqr/dist/jsQR.js', 'www/lib/jsQR.js'],
  ['node_modules/qrcode-generator/qrcode.js', 'www/lib/qrcode.js'],
  ['node_modules/@capacitor/core/dist/capacitor.js', 'www/lib/capacitor.js'],
  // PDF: Anzeigen (pdf.js, als .js damit jeder Server den richtigen Typ meldet) und Bearbeiten (pdf-lib)
  ['node_modules/pdfjs-dist/legacy/build/pdf.min.mjs', 'www/lib/pdf.min.js'],
  ['node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs', 'www/lib/pdf.worker.min.js'],
  ['node_modules/pdf-lib/dist/pdf-lib.min.js', 'www/lib/pdf-lib.min.js'],
];
const dirs = [
  ['node_modules/pdfjs-dist/cmaps', 'www/lib/pdfjs/cmaps'],
  ['node_modules/pdfjs-dist/standard_fonts', 'www/lib/pdfjs/standard_fonts'],
];
mkdirSync('www/lib', { recursive: true });
for (const [from, to] of libs) {
  if (!existsSync(from)) { console.error(`Fehlt: ${from} – erst „npm install“ ausführen.`); process.exit(1); }
  copyFileSync(from, to);
  console.log(`✓ ${to}`);
}
for (const [from, to] of dirs) {
  if (!existsSync(from)) { console.error(`Fehlt: ${from} – erst „npm install“ ausführen.`); process.exit(1); }
  cpSync(from, to, { recursive: true });
  console.log(`✓ ${to}/`);
}
