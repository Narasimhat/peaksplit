// Inlines style.css, core.js and ui.js into a single portable HTML file at dist/peaksplit.html.
// Useful for emailing the tool or running it offline with no server.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');
html = html.replace('<link rel="stylesheet" href="src/style.css">', '<style>\n' + read('src/style.css') + '</style>');
html = html.replace(
  '<script src="src/core.js"></script>\n<script src="src/ui.js"></script>',
  '<script>\n' + read('src/core.js') + '\n' + read('src/ui.js') + '\n</script>'
);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/peaksplit.html'), html);
console.log('Wrote dist/peaksplit.html (' + Math.round(html.length / 1024) + ' kB)');
