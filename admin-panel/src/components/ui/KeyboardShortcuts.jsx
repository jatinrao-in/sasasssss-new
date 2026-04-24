import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Command, Keyboard } from 'lucide-react';

const shortcuts = [
 { keys: ['?'], desc: 'Show keyboard shortcuts' },
 { keys: ['N'], desc: 'Open "Add New" modal (context-aware)' },
 { keys: ['F'], desc: 'Focus search bar' },
 { keys: ['D'], desc: 'Go to Dashboard' },
 { keys: ['Esc'], desc: 'Close any open modal' },
 { keys: ['Ctrl', 'S'], desc: 'Save open form' },
 { keys: ['Ctrl', 'E'], desc: 'Export current page data' },
];

export default function KeyboardShortcuts({ onShortcut }) {
 const [showModal, setShowModal] = useState(false);
 const navigate = useNavigate();

 const handleKeyDown = useCallback((e) => {
 // Don't trigger when typing in inputs
 const tag = e.target.tagName;
 const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;

 // Escape works everywhere
 if (e.key === 'Escape') {
 setShowModal(false);
 onShortcut?.('escape');
 return;
 }

 // Ctrl combos work even in inputs
 if (e.ctrlKey || e.metaKey) {
 if (e.key === 's') {
 e.preventDefault();
 onShortcut?.('save');
 } else if (e.key === 'e') {
 e.preventDefault();
 onShortcut?.('export');
 }
 return;
 }

 if (isInput) return;

 if (e.key === '?') {
 e.preventDefault();
 setShowModal(prev => !prev);
 } else if (e.key === 'n' || e.key === 'N') {
 e.preventDefault();
 onShortcut?.('new');
 } else if (e.key === 'f' || e.key === 'F') {
 e.preventDefault();
 const searchInput = document.querySelector('[data-search-input]') ||
 document.querySelector('input[type="text"][placeholder*="earch"]');
 if (searchInput) searchInput.focus();
 } else if (e.key === 'd' || e.key === 'D') {
 e.preventDefault();
 navigate('/dashboard');
 }
 }, [navigate, onShortcut]);

 useEffect(() => {
 document.addEventListener('keydown', handleKeyDown);
 return () => document.removeEventListener('keydown', handleKeyDown);
 }, [handleKeyDown]);

 if (!showModal) return null;

 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center modal-overlay">
 <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
 <div className="relative bg-[var(--bg-card)] rounded-2xl shadow-2xl w-full max-w-md mx-4 modal-content">
 <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-primary)]">
 <div className="flex items-center gap-2">
 <Keyboard className="w-5 h-5 text-teal-600" />
 <h2 className="text-lg font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</h2>
 </div>
 <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 ">
 <X className="w-4 h-4 text-gray-500" />
 </button>
 </div>
 <div className="px-6 py-4 space-y-3">
 {shortcuts.map(s => (
 <div key={s.desc} className="flex items-center justify-between py-1.5">
 <span className="text-sm text-gray-600 ">{s.desc}</span>
 <div className="flex items-center gap-1">
 {s.keys.map(k => (
 <kbd key={k}
 className="min-w-[28px] h-7 flex items-center justify-center px-2 bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-md text-xs font-mono font-semibold border border-[var(--border-primary)] shadow-sm">
 {k}
 </kbd>
 ))}
 </div>
 </div>
 ))}
 </div>
 <div className="px-6 py-3 border-t border-[var(--border-primary)]">
 <p className="text-xs text-[var(--text-muted)] text-center">Press <kbd className="px-1 py-0.5 bg-[var(--bg-hover)] rounded text-xs font-mono">?</kbd> to toggle this dialog</p>
 </div>
 </div>
 </div>
 );
}
