// Bereitet die Web-App vor: kopiert die Bibliotheken aus node_modules nach www/lib.
// Wird von GitHub Actions (APK + GitHub Pages) und von Cloudflare (Build-Befehl) genutzt.
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
const libs = [
  ['node_modules/jsqr/dist/jsQR.js', 'www/lib/jsQR.js'],
  ['node_modules/qrcode-generator/qrcode.js', 'www/lib/qrcode.js'],
  ['node_modules/@capacitor/core/dist/capacitor.js', 'www/lib/capacitor.js'],
];
mkdirSync('www/lib', { recursive: true });
for (const [from, to] of libs) {
  if (!existsSync(from)) { console.error(`Fehlt: ${from} – erst „npm install“ ausführen.`); process.exit(1); }
  copyFileSync(from, to);
  console.log(`✓ ${to}`);
}
