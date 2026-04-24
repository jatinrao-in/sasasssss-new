const fs = require('fs');
const path = require('path');

const baseDir = __dirname;
const apps = ['admin-panel', 'team-member-pwa'];

// 1. New CSS Content to prepend
const CSS_VARIABLES = `
:root {
  /* Backgrounds */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F8FAFC;
  --bg-card: #FFFFFF;
  --bg-hover: #F1F5F9;
  --bg-input: #FFFFFF;
  --bg-modal: #FFFFFF;
  --bg-sidebar: #FFFFFF;
  --bg-table-header: #F8FAFC;
  --bg-table-row-hover: #F1F5F9;
  --bg-badge-grey: #F1F5F9;
  --bg-skeleton: #E2E8F0;
  --bg-skeleton-shine: #F8FAFC;

  /* Text */
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --text-muted: #94A3B8;
  --text-inverse: #FFFFFF;
  --text-link: #0D9488;
  --text-danger: #DC2626;
  --text-success: #16A34A;
  --text-warning: #D97706;

  /* Borders */
  --border-primary: #E2E8F0;
  --border-secondary: #CBD5E1;
  --border-input: #CBD5E1;
  --border-focus: #0D9488;

  /* Accent (Teal - same in both modes) */
  --accent-primary: #0D9488;
  --accent-hover: #0F766E;
  --accent-light: #CCFBF1;
  --accent-text: #FFFFFF;

  /* Status Colors */
  --status-open-bg: #DCFCE7;
  --status-open-text: #16A34A;
  --status-closed-bg: #F1F5F9;
  --status-closed-text: #475569;
  --status-overdue-bg: #FEE2E2;
  --status-overdue-text: #DC2626;
  --status-pending-bg: #FEF9C3;
  --status-pending-text: #854D0E;
  --status-partial-bg: #DBEAFE;
  --status-partial-text: #1D4ED8;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.10);

  /* Sidebar */
  --sidebar-bg: #FFFFFF;
  --sidebar-text: #475569;
  --sidebar-active-bg: #CCFBF1;
  --sidebar-active-text: #0D9488;
  --sidebar-hover-bg: #F1F5F9;
  --sidebar-icon: #94A3B8;
  --sidebar-active-icon: #0D9488;

  /* Charts */
  --chart-grid: #E2E8F0;
  --chart-tooltip-bg: #FFFFFF;
  --chart-tooltip-text: #0F172A;
  --chart-tooltip-border: #E2E8F0;
}

.dark {
  /* Backgrounds */
  --bg-primary: #0F172A;
  --bg-secondary: #1E293B;
  --bg-card: #1E293B;
  --bg-hover: #334155;
  --bg-input: #1E293B;
  --bg-modal: #1E293B;
  --bg-sidebar: #0F172A;
  --bg-table-header: #1E293B;
  --bg-table-row-hover: #334155;
  --bg-badge-grey: #334155;
  --bg-skeleton: #334155;
  --bg-skeleton-shine: #475569;

  /* Text */
  --text-primary: #F1F5F9;
  --text-secondary: #CBD5E1;
  --text-muted: #64748B;
  --text-inverse: #0F172A;
  --text-link: #2DD4BF;
  --text-danger: #F87171;
  --text-success: #4ADE80;
  --text-warning: #FCD34D;

  /* Borders */
  --border-primary: #334155;
  --border-secondary: #475569;
  --border-input: #475569;
  --border-focus: #0D9488;

  /* Accent (Teal) */
  --accent-primary: #0D9488;
  --accent-hover: #14B8A6;
  --accent-light: #134E4A;
  --accent-text: #FFFFFF;

  /* Status Colors (dark adjusted) */
  --status-open-bg: #14532D;
  --status-open-text: #4ADE80;
  --status-closed-bg: #1E293B;
  --status-closed-text: #94A3B8;
  --status-overdue-bg: #450A0A;
  --status-overdue-text: #F87171;
  --status-pending-bg: #422006;
  --status-pending-text: #FCD34D;
  --status-partial-bg: #1E3A5F;
  --status-partial-text: #60A5FA;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.4);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.5);

  /* Sidebar */
  --sidebar-bg: #0F172A;
  --sidebar-text: #94A3B8;
  --sidebar-active-bg: #134E4A;
  --sidebar-active-text: #2DD4BF;
  --sidebar-hover-bg: #1E293B;
  --sidebar-icon: #64748B;
  --sidebar-active-icon: #2DD4BF;

  /* Charts */
  --chart-grid: #334155;
  --chart-tooltip-bg: #1E293B;
  --chart-tooltip-text: #F1F5F9;
  --chart-tooltip-border: #475569;
}
`;

const SHADCN_OVERRIDES = `
/* ShadCN Dialog */
[data-radix-dialog-content] {
  background: var(--bg-modal) !important;
  border-color: var(--border-primary) !important;
  color: var(--text-primary) !important;
}

/* ShadCN Select */
[data-radix-select-content] {
  background: var(--bg-card) !important;
  border-color: var(--border-primary) !important;
}
[data-radix-select-item]:hover {
  background: var(--bg-hover) !important;
}
[data-radix-select-item][data-highlighted] {
  background: var(--bg-hover) !important;
  color: var(--text-primary) !important;
}

/* ShadCN Sheet */
[data-radix-dialog-content][data-side] {
  background: var(--bg-modal) !important;
  border-color: var(--border-primary) !important;
}

/* ShadCN Dropdown */
[data-radix-dropdown-menu-content] {
  background: var(--bg-card) !important;
  border-color: var(--border-primary) !important;
}
[data-radix-dropdown-menu-item]:hover {
  background: var(--bg-hover) !important;
}

/* ShadCN Popover */
[data-radix-popover-content] {
  background: var(--bg-card) !important;
  border-color: var(--border-primary) !important;
}

/* ShadCN Tabs */
[role="tablist"] {
  background: var(--bg-secondary) !important;
}
[role="tab"][data-state="active"] {
  background: var(--bg-card) !important;
  color: var(--text-primary) !important;
}
[role="tab"][data-state="inactive"] {
  color: var(--text-muted) !important;
}

/* ShadCN Input */
.input, input[type="text"], 
input[type="email"], input[type="password"],
input[type="number"], textarea {
  background: var(--bg-input) !important;
  border-color: var(--border-input) !important;
  color: var(--text-primary) !important;
}
input::placeholder, textarea::placeholder {
  color: var(--text-muted) !important;
}

/* ShadCN Calendar */
[data-radix-calendar] {
  background: var(--bg-card) !important;
  color: var(--text-primary) !important;
}

/* ShadCN Table */
tr:hover td {
  background: var(--bg-table-row-hover) !important;
}
th {
  background: var(--bg-table-header) !important;
  color: var(--text-secondary) !important;
}
td {
  color: var(--text-primary) !important;
  border-color: var(--border-primary) !important;
}

/* Smooth theme transition on ALL elements */
*, *::before, *::after {
  transition: 
    background-color 300ms ease,
    border-color 300ms ease,
    color 200ms ease,
    box-shadow 300ms ease !important;
}

/* Exception: don't transition these */
.no-transition,
.no-transition * {
  transition: none !important;
}
`;

// Update hooks
const newHook = `import { useState, useEffect, createContext, useContext } from 'react';

const DarkModeContext = createContext({ isDark: false, toggle: () => {} });

export function DarkModeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggle = () => setIsDark(prev => !prev);

  // We expose both \`dark\` and \`isDark\` to maintain backward compatibility
  return (
    <DarkModeContext.Provider value={{ dark: isDark, isDark, toggle }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}
`;

const walkSync = (dir, callback) => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walkSync(filepath, callback);
    } else if (stats.isFile()) {
      callback(filepath);
    }
  });
};

const regexReplacements = [
  // Backgrounds
  { r: /bg-white dark:bg-gray-[0-9]{3}/g, p: 'bg-[var(--bg-card)]' },
  { r: /bg-gray-50 dark:bg-gray-[0-9]{3}/g, p: 'bg-[var(--bg-secondary)]' },
  { r: /bg-gray-100 dark:bg-gray-[0-9]{3}/g, p: 'bg-[var(--bg-hover)]' },
  
  // Texts
  { r: /text-gray-900 dark:text-gray-100/g, p: 'text-[var(--text-primary)]' },
  { r: /text-gray-900 dark:text-white/g, p: 'text-[var(--text-primary)]' },
  { r: /text-gray-800 dark:text-gray-200/g, p: 'text-[var(--text-primary)]' },
  { r: /text-gray-800 dark:text-gray-100/g, p: 'text-[var(--text-primary)]' },
  { r: /text-gray-700 dark:text-gray-300/g, p: 'text-[var(--text-primary)]' },
  { r: /text-gray-600 dark:text-gray-400/g, p: 'text-[var(--text-secondary)]' },
  { r: /text-gray-500 dark:text-gray-400/g, p: 'text-[var(--text-muted)]' },
  { r: /text-gray-400 dark:text-gray-500/g, p: 'text-[var(--text-muted)]' },
  
  // Borders
  { r: /border-gray-200 dark:border-gray-700/g, p: 'border-[var(--border-primary)]' },
  { r: /border-gray-100 dark:border-gray-700/g, p: 'border-[var(--border-primary)]' },
  { r: /border-gray-100 dark:border-gray-800/g, p: 'border-[var(--border-primary)]' },
  { r: /border-gray-200 dark:border-gray-600/g, p: 'border-[var(--border-primary)]' },
  
  // Single-side hardcoded (that missed a dark class)
  { r: /(?<!\S)bg-white(?!\/)(?!\S)/g, p: 'bg-[var(--bg-card)]' },
  { r: /(?<!\S)text-gray-900(?!\S)/g, p: 'text-[var(--text-primary)]' },
  { r: /(?<!\S)text-gray-800(?!\S)/g, p: 'text-[var(--text-primary)]' },
  { r: /(?<!\S)border-gray-200(?!\S)/g, p: 'border-[var(--border-primary)]' },
  { r: /(?<!\S)text-gray-500(?!\S)/g, p: 'text-[var(--text-muted)]' },
  
  { r: /dark:[^\\s'"`{}]+/g, p: '' },
  { r: /dark:bg-transparent/g, p: '' },
];

apps.forEach(app => {
  console.log('Processing app:', app);
  
  // 1. Process index.css
  const cssPath = path.join(baseDir, app, 'src', 'index.css');
  if (fs.existsSync(cssPath)) {
    let css = fs.readFileSync(cssPath, 'utf8');
    // Remove old data-theme dark overrides to avoid conflicts
    css = css.replace(/\[data-theme="dark"\][^}]+}/g, '');
    
    // Inject variables at top, transitions at bottom
    css = CSS_VARIABLES + '\n' + css + '\n' + SHADCN_OVERRIDES;
    fs.writeFileSync(cssPath, css);
    console.log('Updated index.css');
  }

  // 2. Process hook
  const hooksDir = path.join(baseDir, app, 'src', 'hooks');
  const hookFile = fs.existsSync(path.join(hooksDir, 'useDarkMode.jsx')) 
    ? 'useDarkMode.jsx' 
    : fs.existsSync(path.join(hooksDir, 'useTheme.jsx')) 
    ? 'useTheme.jsx' 
    : 'useTheme.js';
  
  const hookPath = path.join(hooksDir, hookFile);
  if (fs.existsSync(hookPath)) {
    fs.writeFileSync(hookPath, newHook);
    console.log('Updated', hookFile);
  }

  // 3. Process components
  const srcDir = path.join(baseDir, app, 'src');
  walkSync(srcDir, (filepath) => {
    if (filepath.endsWith('.jsx') || filepath.endsWith('.js')) {
      let content = fs.readFileSync(filepath, 'utf8');
      let originalContent = content;
      
      regexReplacements.forEach(({ r, p }) => {
        content = content.replace(r, p);
      });
      
      // Clean up consecutive double spaces that might happen when deleting dark: classes
      content = content.replace(/  +/g, ' ');
      
      if (originalContent !== content) {
        fs.writeFileSync(filepath, content);
        console.log('Refactored classes in:', filepath);
      }
    }
  });

  // 4. tailwind.config.js for team-member-pwa (and admin-panel if exists)
  const twPath = path.join(baseDir, app, 'tailwind.config.js');
  if (fs.existsSync(twPath)) {
    let tw = fs.readFileSync(twPath, 'utf8');
    
    if (!tw.includes('--bg-primary')) {
      const colorsInjection = `
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          card: 'var(--bg-card)',
          hover: 'var(--bg-hover)',
          input: 'var(--bg-input)',
          modal: 'var(--bg-modal)',
          sidebar: 'var(--bg-sidebar)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
          link: 'var(--text-link)',
          danger: 'var(--text-danger)',
          success: 'var(--text-success)',
          warning: 'var(--text-warning)',
        },
        border: {
          primary: 'var(--border-primary)',
          secondary: 'var(--border-secondary)',
          input: 'var(--border-input)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          hover: 'var(--accent-hover)',
          light: 'var(--accent-light)',
        },
        sidebar: {
          bg: 'var(--sidebar-bg)',
          text: 'var(--sidebar-text)',
          activeBg: 'var(--sidebar-active-bg)',
          activeText: 'var(--sidebar-active-text)',
          hover: 'var(--sidebar-hover-bg)',
        }`;
      
      tw = tw.replace(/colors:\\s*{/, 'colors: {' + colorsInjection + ',');
      fs.writeFileSync(twPath, tw);
      console.log('Updated tailwind.config.js');
    }
  }
});

console.log('DONE');
