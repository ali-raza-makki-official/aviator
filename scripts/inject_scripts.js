const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../public/index.html');
let html = fs.readFileSync(indexPath, 'utf8');

let modified = false;

// Inject code bundle stylesheet if not present
if (!html.includes('styles.e0ec408709dc004a.css')) {
    const styleTag = `<link rel="stylesheet" href="/code/aviator-next.spribegaming.com/styles.e0ec408709dc004a.css">\n</head>`;
    html = html.replace(/<\/head>/i, styleTag);
    modified = true;
}

// Inject code bundle scripts and socket bridge if not present
if (!html.includes('aviator-bridge.js')) {
    const scriptTags = `
<script src="/code/aviator-next.spribegaming.com/runtime.da7dcd113f9ca8e6.js" type="module"></script>
<script src="/code/aviator-next.spribegaming.com/polyfills.04f7ca256c7fd371.js" type="module"></script>
<script src="/code/aviator-next.spribegaming.com/main.4329ee3edb01a2a6.js" type="module"></script>
<script src="/socket.io/socket.io.js"></script>
<script src="/js/aviator-bridge.js"></script>
</body></html>`;
    if (/<\/body>/i.test(html)) {
        html = html.replace(/<\/body>(\s*<\/html>)?/i, scriptTags);
    } else {
        html += scriptTags;
    }
    modified = true;
}

if (modified) {
    fs.writeFileSync(indexPath, html);
    console.log('Successfully injected code bundle scripts and styles into public/index.html');
} else {
    console.log('All code bundle scripts and styles already present in public/index.html.');
}
