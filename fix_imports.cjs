const fs = require('fs');
const path = require('path');

const apps = ['admin-panel', 'team-member-pwa'];

apps.forEach(app => {
  const cssPath = path.join(__dirname, app, 'src', 'index.css');
  if (fs.existsSync(cssPath)) {
    let css = fs.readFileSync(cssPath, 'utf8');

    // Extract all @import and @tailwind statements
    const importRegex = /^@import\s+[^;]+;\s*/gm;
    const tailwindRegex = /^@tailwind\s+[^;]+;\s*/gm;

    let imports = '';
    let tailwinds = '';

    css = css.replace(importRegex, (match) => {
      imports += match;
      return '';
    });

    css = css.replace(tailwindRegex, (match) => {
      tailwinds += match;
      return '';
    });

    // Remove duplicate CSS_VARIABLES if any were injected multiple times by error
    // But since it's just a fix, we'll just prepend the imports to the VERY top.
    
    // Assemble the final CSS
    const finalCss = imports + tailwinds + css;
    
    fs.writeFileSync(cssPath, finalCss);
    console.log(`Fixed @imports in ${app}/src/index.css`);
  }
});
