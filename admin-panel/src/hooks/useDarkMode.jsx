import { useState, useEffect, createContext, useContext } from 'react';

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

 // We expose both `dark` and `isDark` to maintain backward compatibility
 return (
 <DarkModeContext.Provider value={{ dark: isDark, isDark, toggle }}>
 {children}
 </DarkModeContext.Provider>
 );
}

export function useDarkMode() {
 return useContext(DarkModeContext);
}
