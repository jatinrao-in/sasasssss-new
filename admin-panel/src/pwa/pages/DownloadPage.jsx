import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import { 
  Star, Download, ArrowLeft, Share2, PlusSquare, 
  ShieldCheck, CheckCircle2, Sparkles, Smartphone, Monitor, Info
} from 'lucide-react';
import { Button } from '../components/ui/button';

export default function DownloadPage() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(window.deferredPrompt || null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    // Check display standalone mode
    const isPwa = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(isPwa);

    // Detect iOS Device
    const ua = window.navigator.userAgent;
    const isIPad = !!ua.match(/iPad/i);
    const isIPhone = !!ua.match(/iPhone/i);
    setIsIOS(isIPad || isIPhone);

    const handlePromptAvailable = () => {
      setDeferredPrompt(window.deferredPrompt);
    };

    window.addEventListener('pwa-prompt-available', handlePromptAvailable);

    const checkInterval = setInterval(() => {
      if (window.deferredPrompt && !deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
      }
    }, 1000);

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      clearInterval(checkInterval);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || window.deferredPrompt;
    if (!promptEvent) {
      alert("Direct installation is not supported by your current browser. Please use your browser's menu to Add to Home Screen.");
      return;
    }

    try {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        window.deferredPrompt = null;
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.error('PWA install prompt error:', err);
    }
  };

  const carouselSlides = [
    {
      title: "Real-time Tasks Workspace",
      desc: "Manage tasks instantly. Update statuses, attach logs, and communicate updates from the field.",
      color: "border-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50/50",
      accentBar: "bg-blue-600",
      icon: <Sparkles className="w-5 h-5 text-blue-600" />
    },
    {
      title: "Intelligent Reminders",
      desc: "Never miss client follow-ups or critical payment milestones with push notification alerts.",
      color: "border-yellow-500",
      textColor: "text-yellow-600",
      bgColor: "bg-yellow-50/40",
      accentBar: "bg-yellow-500",
      icon: <CheckCircle2 className="w-5 h-5 text-yellow-600" />
    },
    {
      title: "Salary & Payout Tracker",
      desc: "Review monthly wage structures, verify pending advance requests, and log team expenses.",
      color: "border-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50/50",
      accentBar: "bg-green-600",
      icon: <ShieldCheck className="w-5 h-5 text-green-600" />
    }
  ];

  const reviews = [
    { name: "Rahul Sharma", rating: 5, date: "June 12, 2026", text: "Exceptional offline capability. Works on industrial sites even without a cellular network. Home screen shortcut is perfect." },
    { name: "Jatin Rao", rating: 5, date: "June 10, 2026", text: "Extremely fast. Does not waste storage space. Highly recommended for task dispatch and update tracking." },
    { name: "Vikram Singh", rating: 4, date: "May 28, 2026", text: "Instant push notification triggers. Layout is clean, fast, and does not require complex browser sign-ins." }
  ];

  const ratingBars = [
    { stars: 5, percentage: "85%", color: "bg-green-600" },
    { stars: 4, percentage: "10%", color: "bg-blue-600" },
    { stars: 3, percentage: "3%", color: "bg-yellow-500" },
    { stars: 2, percentage: "1%", color: "bg-orange-500" },
    { stars: 1, percentage: "1%", color: "bg-red-500" }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-gray-800 flex flex-col items-center">
      
      {/* Google-Inspired Top Color Accent Bar */}
      <div className="w-full h-1.5 flex z-20">
        <div className="flex-1 bg-[#4285F4]"></div>
        <div className="flex-1 bg-[#EA4335]"></div>
        <div className="flex-1 bg-[#FBBC05]"></div>
        <div className="flex-1 bg-[#34A853]"></div>
      </div>

      {/* Main Header / Store Bar */}
      <header className="w-full bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button 
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-[#4285F4] hover:text-blue-700 font-bold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Portal</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34A853] animate-pulse"></span>
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Secure Store Link</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl px-4 py-8 md:py-12 flex-1">
        
        {/* WIDESCREEN GRID SYSTEM (Desktop, Tablet, Mobile responsive) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDE: App Icon, Primary Metrics, Highlights & Installation (col-span-7) */}
          <div className="md:col-span-7 lg:col-span-8 space-y-8">
            
            {/* Main App Info Block */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
              <img 
                src={logoImg} 
                alt="Saya Logo" 
                className="w-24 h-24 rounded-2xl object-cover shadow-md border border-gray-100 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                  Saya Industrial Team App
                </h1>
                <p className="text-sm font-bold text-[#4285F4] mt-1">
                  Saya Industrial CRM
                </p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start items-center mt-3">
                  <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Official Release
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                    PWA Certified
                  </span>
                </div>
              </div>
            </div>

            {/* Installation Action Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                Device Installation
              </h2>

              {isStandalone ? (
                <div className="bg-green-50 text-[#34A853] rounded-xl p-4 border border-green-200 text-center font-bold text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#34A853]" />
                  <span>Application is installed on this device</span>
                </div>
              ) : isIOS ? (
                /* iOS Specific Guide */
                <div className="space-y-4">
                  <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
                    <h3 className="font-extrabold text-gray-900 text-sm mb-3.5 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-[#4285F4]" />
                      <span>Safari iOS Setup</span>
                    </h3>
                    <ul className="space-y-3.5 text-xs text-gray-700 font-medium">
                      <li className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-[#4285F4] text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
                        <p className="pt-0.5">
                          Launch the Safari browser on your iOS device.
                        </p>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-[#4285F4] text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
                        <p className="pt-0.5 flex items-center gap-1.5 flex-wrap">
                          Tap the action <strong>Share button</strong> <span className="inline-flex items-center justify-center bg-white border border-gray-200 p-1 rounded"><Share2 className="w-3.5 h-3.5 text-[#4285F4]" /></span> from the system options menu.
                        </p>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-[#4285F4] text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</span>
                        <p className="pt-0.5 flex items-center gap-1.5 flex-wrap">
                          Select <strong>Add to Home Screen</strong> <span className="inline-flex items-center justify-center bg-white border border-gray-200 p-1 rounded"><PlusSquare className="w-3.5 h-3.5 text-gray-800" /></span> list entry to install.
                        </p>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                /* Android / Chrome Desktop Install button */
                <div className="space-y-4">
                  <Button 
                    onClick={handleInstallClick}
                    className="w-full h-12 bg-[#34A853] hover:bg-green-700 text-white font-extrabold shadow-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 border-0"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download App Instantly</span>
                  </Button>

                  {!deferredPrompt && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3 font-medium">
                      <Info className="w-4 h-4 text-[#4285F4] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Browser Installation Option</p>
                        <p className="mt-1 leading-relaxed">
                          If the button is disabled, click your browser's options menu icon (normally three dots or install indicator in address bar) and choose "Install App" or "Add to Home Screen".
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Features & Highlights Carousel */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                Application Highlights
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {carouselSlides.map((slide, index) => (
                  <div 
                    key={index}
                    onClick={() => setActiveSlide(index)}
                    className={`border rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md relative overflow-hidden flex flex-col justify-between ${slide.color} ${slide.bgColor} ${index === activeSlide ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
                    style={{ minHeight: '160px' }}
                  >
                    <div className={`absolute top-0 left-0 w-full h-1 ${slide.accentBar}`} />
                    <div className="flex items-center gap-2">
                      {slide.icon}
                      <h3 className={`font-extrabold text-xs uppercase tracking-wider ${slide.textColor}`}>
                        {slide.title.split(' ')[0]}
                      </h3>
                    </div>
                    <div className="mt-3">
                      <h4 className="font-bold text-gray-900 text-sm leading-tight mb-1">{slide.title}</h4>
                      <p className="text-xs text-gray-500 leading-normal font-medium">{slide.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* About Application Specs */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                Details & Information
              </h2>
              <div className="text-sm leading-relaxed text-gray-600 font-medium space-y-4">
                <p>
                  Saya Industrial Team App is a lightweight, optimized Progressive Web Application (PWA) designed to provide instant task updates, client communications, salary structures, and expense logs. It features automatic background updates, real-time message sync, offline caching, and responsive design for all screen resolutions.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100 text-xs">
                  <div>
                    <span className="block text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Version</span>
                    <span className="font-bold text-gray-800">2.4.0</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Updated On</span>
                    <span className="font-bold text-gray-800">June 14, 2026</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Size</span>
                    <span className="font-bold text-gray-800">Under 2.5 MB</span>
                  </div>
                  <div>
                    <span className="block text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Developer</span>
                    <span className="font-bold text-gray-800">Saya Industrial</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT SIDE: Rating Distribution, Reviews, Specifications (col-span-5) */}
          <div className="md:col-span-5 lg:col-span-4 space-y-8">
            
            {/* Ratings Summary & Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                Ratings & Feedback
              </h2>
              
              <div className="flex items-center gap-6 mb-6">
                <div className="text-left">
                  <span className="block text-5xl font-black text-gray-900 leading-none">4.8</span>
                  <div className="flex gap-0.5 mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-[#FBBC05] text-[#FBBC05]" />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mt-1.5">
                    42 total reviews
                  </span>
                </div>

                {/* Rating Bar Charts */}
                <div className="flex-1 space-y-1">
                  {ratingBars.map((bar, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                      <span className="w-3">{bar.stars}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${bar.color}`} style={{ width: bar.percentage }} />
                      </div>
                      <span className="w-7 text-right text-[10px]">{bar.percentage}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Device Compatibility Widget */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                Compatibility
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-150">
                  <Smartphone className="w-5 h-5 text-[#4285F4]" />
                  <div className="text-xs">
                    <p className="font-bold text-gray-800">Mobile Devices</p>
                    <p className="text-gray-500 mt-0.5 font-medium">100% compatible. Supports offline usage.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-150">
                  <Monitor className="w-5 h-5 text-[#34A853]" />
                  <div className="text-xs">
                    <p className="font-bold text-gray-800">Desktop Devices</p>
                    <p className="text-gray-500 mt-0.5 font-medium">Fully compatible. Launches as standalone app.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* User Reviews Listing */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                Reviews
              </h2>
              <div className="space-y-5">
                {reviews.map((review, index) => (
                  <div key={index} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0 font-medium">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-800 text-xs">{review.name}</span>
                      <span className="text-[10px] text-gray-400">{review.date}</span>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Star 
                          key={starIndex} 
                          className={`w-2.5 h-2.5 ${starIndex < review.rating ? 'fill-[#FBBC05] text-[#FBBC05]' : 'text-gray-200'}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                      {review.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
