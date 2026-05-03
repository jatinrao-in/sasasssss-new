import React, { useState, useEffect } from 'react';
import { Download, Share, X, PlusSquare } from 'lucide-react';
import { Button } from './ui/button';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    // Check if already installed
    const isPwa = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(isPwa);

    if (isPwa) return;

    // Check if user dismissed prompt previously
    const hasDismissed = localStorage.getItem('pwa_install_dismissed');
    if (hasDismissed === 'true') return;

    // Detect iOS
    const ua = window.navigator.userAgent;
    const webkit = !!ua.match(/WebKit/i);
    const isIPad = !!ua.match(/iPad/i);
    const isIPhone = !!ua.match(/iPhone/i);
    const isIOSDevice = isIPad || isIPhone;
    const isSafari = isIOSDevice && webkit && !ua.match(/CriOS/i);

    if (isIOSDevice && isSafari) {
      setIsIOS(true);
      // Small delay so it doesn't pop up immediately on first paint
      setTimeout(() => setShowPrompt(true), 2000);
    }

    // Android / Chrome - wait for beforeinstallprompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="mx-auto max-w-sm rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 relative overflow-hidden">
        
        {/* Top styling accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-teal-600" />
        
        <button 
          onClick={handleDismiss}
          className="absolute right-3 top-3 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close install prompt"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4 pr-6">
          <div className="w-12 h-12 flex-shrink-0 bg-teal-50 rounded-xl flex items-center justify-center">
            <Download className="w-6 h-6 text-teal-600" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 leading-tight mb-1">Install App</h3>
            <p className="text-sm text-gray-500 mb-4 leading-snug">
              Install our app on your device for quick access and better experience.
            </p>

            {isIOS ? (
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                <p className="flex items-center gap-2 mb-2">
                  1. Tap <Share className="w-4 h-4 text-blue-500" /> in the toolbar
                </p>
                <p className="flex items-center gap-2">
                  2. Select <PlusSquare className="w-4 h-4 text-gray-700" /> Add to Home Screen
                </p>
              </div>
            ) : (
              <Button 
                onClick={handleInstallClick} 
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-sm"
              >
                Install Now
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
