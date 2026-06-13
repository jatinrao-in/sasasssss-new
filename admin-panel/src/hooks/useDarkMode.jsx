import { createContext, useContext } from 'react';

const DarkModeContext = createContext({ dark: false, isDark: false, toggle: () => {} });

export function DarkModeProvider({ children }) {
  // Always light mode — dark mode removed
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }
  return (
    <DarkModeContext.Provider value={{ dark: false, isDark: false, toggle: () => {} }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}
