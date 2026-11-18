// Builds assets/css/bootstrap.purged.min.css: Bootstrap 5.3 with only the
// selectors used by the HTML pages and scripts. Run via `npm run build`.
// If you add new Bootstrap classes (or move to WordPress templates), re-run
// the build, or link assets/vendor/bootstrap/bootstrap.min.css (full) instead.
import { PurgeCSS } from 'purgecss';
import { writeFileSync } from 'node:fs';

const [result] = await new PurgeCSS().purge({
  content: ['*.html', 'assets/js/main.js', 'assets/js/animations.js'],
  css: ['assets/vendor/bootstrap/bootstrap.min.css'],
  safelist: { standard: [/^visually-hidden/, /^is-/, /^show$/], greedy: [/data-bs-theme/] },
  variables: false,
  keyframes: true,
  fontFace: true,
});
const header = '/*! Bootstrap v5.3.9 (https://getbootstrap.com/) | MIT License | purged build for M/S. Cooling Point */\n';
writeFileSync('assets/css/bootstrap.purged.min.css', header + result.css.replace(/\/\*![\s\S]*?\*\//, ''));
console.log(`bootstrap.purged.min.css: ${(result.css.length / 1024).toFixed(1)} KB`);
