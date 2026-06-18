import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Menu, 
  X,
  CreditCard,
  Briefcase,
  Users,
  DollarSign,
  Globe,
  FileText,
  ShieldCheck,
  Calendar,
  Layers,
  Wrench,
  FileSpreadsheet,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  HeartHandshake,
  HelpCircle,
  ExternalLink,
  Cpu,
  Eye,
  Workflow,
  BookOpen
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  const faqs = [
    {
      q: "What is Saya CRM?",
      a: "Saya CRM is a unified enterprise management workspace built for industrial teams to track tasks, log follow-ups, record incoming/outgoing payments, manage RGP challans, assign locker tools, and run monthly payroll."
    },
    {
      q: "How does the Locker Tools management system work?",
      a: "The locker module allows administrators to log physical equipment (like drill machines, testing kits, and safety gear), assign them to team members, track return statuses, and send reminders for overdue items."
    },
    {
      q: "Can we manage RGP (Returnable Gate Passes)?",
      a: "Yes. Saya CRM includes a dedicated RGP challan creator and tracker to manage materials leaving the factory gate, ensuring that everything taken out is properly logged, audited, and returned."
    },
    {
      q: "How do client follow-ups and enquiries function?",
      a: "The enquiries log captures lead details, while follow-ups let sales personnel schedule call reminders, record feedback, and track payment milestones with integrated browser alerts."
    },
    {
      q: "Is the software fully offline-capable?",
      a: "Yes, Saya CRM is built as a Progressive Web App (PWA). It runs offline, caches essential database contexts, allows offline logging, and syncs automatically with Firestore once internet connectivity is restored."
    }
  ];

  // Universal action redirect
  const handleActionRedirect = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#F0FCF4] text-[#0F172A] font-sans selection:bg-[#ADFA1D] selection:text-[#0D3C34] overflow-x-hidden relative">
      
      {/* PROFESSIONAL HIGH-QUALITY ANIMATION SYSTEMS */}
      <style>{`
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.02); }
        }
        @keyframes dash-scroll {
          to {
            stroke-dashoffset: -20;
          }
        }
        @keyframes float-ambient-1 {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          50% { transform: translateY(-25px) translateX(15px) scale(1.1); }
        }
        @keyframes float-ambient-2 {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          50% { transform: translateY(20px) translateX(-20px) scale(0.9); }
        }
        @keyframes bar-grow {
          from { height: 0%; }
          to { height: var(--target-height); }
        }
        
        .animate-slide-up {
          animation: slide-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .animate-fade-in {
          animation: fade-in 1.2s ease-out forwards;
          opacity: 0;
        }
        .animate-pulse-soft {
          animation: pulse-soft 2.5s ease-in-out infinite;
        }
        .animate-dash-scroll {
          animation: dash-scroll 1.5s linear infinite;
        }
        .animate-float-1 {
          animation: float-ambient-1 12s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: float-ambient-2 15s ease-in-out infinite;
        }
        
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }

        .perspective-container {
          perspective: 1200px;
        }
        .perspective-card {
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s ease;
          transform-style: preserve-3d;
        }
        .perspective-card:hover {
          transform: rotateY(6deg) rotateX(4deg) translateY(-8px);
          box-shadow: 0 20px 40px -15px rgba(13,60,52,0.15);
        }
      `}</style>

      {/* Floating Ambient Blurs */}
      <div className="absolute top-[10%] left-[-5%] w-96 h-96 bg-[#A3E635]/10 rounded-full filter blur-3xl opacity-60 animate-float-1 pointer-events-none z-0"></div>
      <div className="absolute top-[40%] right-[-5%] w-80 h-80 bg-emerald-300/10 rounded-full filter blur-3xl opacity-50 animate-float-2 pointer-events-none z-0"></div>
      <div className="absolute bottom-[15%] left-[8%] w-[450px] h-[450px] bg-[#A3E635]/5 rounded-full filter blur-3xl opacity-40 animate-float-1 pointer-events-none z-0"></div>

      {/* 1. HEADER / NAVIGATION */}
      <nav className="sticky top-0 z-50 bg-[#F0FCF4]/90 backdrop-blur-md border-b-2 border-[#0D3C34]/15 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-2.5 cursor-pointer hover:scale-102 transition-transform" onClick={handleActionRedirect}>
              <img src="/logo.jpg" alt="Saya Logo" className="w-9 h-9 rounded-xl border-2 border-[#0D3C34] shadow-[2px_2px_0px_#A3E635]" />
              <span className="text-xl font-black tracking-tighter text-[#0D3C34] uppercase">SAYA CRM</span>
            </div>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-8 font-black text-sm text-[#0D3C34]/80">
              <a href="#features" className="relative py-2 hover:text-[#0D3C34] transition-all after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#0D3C34] hover:after:w-full after:transition-all after:duration-250">Workspace Modules</a>
              <a href="#automation" className="relative py-2 hover:text-[#0D3C34] transition-all after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#0D3C34] hover:after:w-full after:transition-all after:duration-250">Automation Integration</a>
              <a href="#faq" className="relative py-2 hover:text-[#0D3C34] transition-all after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#0D3C34] hover:after:w-full after:transition-all after:duration-250">FAQ</a>
              <a href="#support" className="relative py-2 hover:text-[#0D3C34] transition-all after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#0D3C34] hover:after:w-full after:transition-all after:duration-250">Support</a>
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              <div className="h-5 w-[1.5px] bg-[#0D3C34]/25" />
              <button 
                onClick={handleActionRedirect}
                className="group bg-[#0D3C34] text-white font-black text-xs uppercase px-7 py-3 rounded-full hover:bg-opacity-90 transition-all shadow-[3px_3px_0px_#A3E635] active:translate-x-0.5 active:translate-y-0.5 border-2 border-[#0D3C34] flex items-center gap-1.5"
              >
                <span>Log in</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#A3E635] group-hover:translate-x-0.5 transition-transform duration-200" />
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-[#0D3C34] hover:opacity-80 transition-opacity p-2"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#F0FCF4] border-b border-[#0D3C34]/10 py-6 px-4 space-y-4">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="block font-semibold text-lg text-[#0D3C34]/80 hover:text-[#0D3C34] transition-colors"
            >
              Workspace Modules
            </a>
            <a 
              href="#automation" 
              onClick={() => setMobileMenuOpen(false)}
              className="block font-semibold text-lg text-[#0D3C34]/80 hover:text-[#0D3C34] transition-colors"
            >
              Automation Integration
            </a>
            <a 
              href="#faq" 
              onClick={() => setMobileMenuOpen(false)}
              className="block font-semibold text-lg text-[#0D3C34]/80 hover:text-[#0D3C34] transition-colors"
            >
              FAQ
            </a>
            <a 
              href="#support" 
              onClick={() => setMobileMenuOpen(false)}
              className="block font-semibold text-lg text-[#0D3C34]/80 hover:text-[#0D3C34] transition-colors"
            >
              Support
            </a>
            <hr className="border-[#0D3C34]/10" />
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleActionRedirect();
                }}
                className="w-full text-center bg-[#0D3C34] text-white font-bold text-base py-3 rounded-full hover:bg-opacity-90 transition-all shadow-md border-2 border-[#0D3C34]"
              >
                Log in
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative pt-12 pb-24 px-4 overflow-hidden z-10">
        <div className="max-w-4xl mx-auto text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#A3E635]/25 border-2 border-[#0D3C34] rounded-full px-4 py-1.5 mb-8 text-[#0D3C34] text-xs font-black uppercase tracking-wider animate-pulse-soft">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#A3E635] border border-[#0D3C34]"></span>
            SAYA CRM PWA IS ACTIVE
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#0D3C34] tracking-tight leading-[1.05] mb-6 animate-slide-up">
            Unified workspace<br />for industrial teams
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-[#475569] max-w-2xl mx-auto mb-10 leading-relaxed font-semibold animate-slide-up delay-100">
            Manage field tasks, track client enquiries, follow up calls, log project payments, handle RGP challans, and issue tools—all in one fully offline PWA.
          </p>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-slide-up delay-200">
            <button 
              onClick={handleActionRedirect}
              className="w-full sm:w-auto bg-[#A3E635] text-[#0D3C34] font-black text-lg px-9 py-4.5 rounded-full hover:bg-[#92cf2c] transition-all shadow-[6px_6px_0px_#0D3C34] hover:-translate-y-1 hover:translate-x-[-1px] hover:shadow-[7px_7px_0px_#0D3C34] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#0D3C34] flex items-center justify-center gap-2 border-2 border-[#0D3C34]"
            >
              Get started
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Dashboard Mockup Showcase */}
        <div className="max-w-5xl mx-auto mt-6 relative animate-fade-in delay-300 perspective-container">
          <div className="bg-white rounded-3xl p-3 sm:p-4 shadow-[0_30px_60px_-15px_rgba(13,60,52,0.18)] border-2 border-[#0D3C34] perspective-card">
            {/* Browser Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#0D3C34]/10 mb-3 px-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400 border border-[#0D3C34]/20"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-400 border border-[#0D3C34]/20"></span>
                <span className="w-3 h-3 rounded-full bg-green-400 border border-[#0D3C34]/20"></span>
                <span className="text-[10px] text-gray-400 ml-4 font-mono select-none">https://sasasssss-one.vercel.app/pwa/dashboard</span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#A3E635] animate-ping border border-[#0D3C34]"></span>
            </div>
            
            {/* Screen layout mockup */}
            <div className="bg-[#FAF9F5] rounded-2xl overflow-hidden border-2 border-[#0D3C34]/15 grid grid-cols-12 min-h-[360px] sm:min-h-[480px]">
              
              {/* Left sidebar mimic */}
              <div className="col-span-3 bg-white border-r-2 border-[#0D3C34]/10 p-4 hidden md:flex flex-col gap-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-[#0D3C34] flex items-center justify-center text-[10px] font-bold text-white shadow-sm">S</div>
                  <span className="text-[11px] font-black text-[#0D3C34]">Saya Console</span>
                </div>
                <div className="space-y-3">
                  <div className="h-7 w-full rounded-lg bg-[#FAF9F5] flex items-center px-2 font-bold text-[10px] text-[#0D3C34]/80 gap-1.5 border border-[#0D3C34]/5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Tasks
                  </div>
                  <div className="h-7 w-full rounded-lg bg-white flex items-center px-2 font-bold text-[10px] text-[#0D3C34]/60 gap-1.5 hover:bg-gray-50 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Follow-ups
                  </div>
                  <div className="h-7 w-full rounded-lg bg-white flex items-center px-2 font-bold text-[10px] text-[#0D3C34]/60 gap-1.5 hover:bg-gray-50 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Payments
                  </div>
                  <div className="h-7 w-full rounded-lg bg-white flex items-center px-2 font-bold text-[10px] text-[#0D3C34]/60 gap-1.5 hover:bg-gray-50 transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Locker Tools
                  </div>
                </div>
              </div>

              {/* Main dashboard mimic body */}
              <div className="col-span-12 md:col-span-9 p-4 sm:p-6 space-y-6 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Workspace summary</span>
                    <h3 className="text-lg sm:text-xl font-black text-[#0D3C34]">Saya CRM Admin Console</h3>
                  </div>
                  <span className="bg-[#A3E635] text-[#0D3C34] text-[10px] font-black px-3 py-1 rounded-full border-2 border-[#0D3C34] shadow-[1px_1px_0px_#0D3C34]">ACTIVE</span>
                </div>

                {/* Dashboard Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="bg-[#EBFCEE] border-2 border-[#0D3C34] p-4 rounded-xl space-y-1 shadow-[3px_3px_0px_#0D3C34] hover:scale-102 transition-transform">
                    <span className="text-[10px] text-[#0D3C34]/60 font-black">Tasks Active</span>
                    <p className="text-lg sm:text-xl font-black text-[#0D3C34]">14 / 18 Done</p>
                  </div>
                  <div className="bg-[#FFF8E6] border-2 border-[#0D3C34] p-4 rounded-xl space-y-1 shadow-[3px_3px_0px_#0D3C34] hover:scale-102 transition-transform">
                    <span className="text-[10px] text-[#0D3C34]/60 font-black">Follow-ups Pending</span>
                    <p className="text-lg sm:text-xl font-black text-[#0D3C34]">8 Actionable</p>
                  </div>
                  <div className="bg-[#F6E6FF] border-2 border-[#0D3C34] p-4 rounded-xl col-span-2 lg:col-span-1 space-y-1 shadow-[3px_3px_0px_#0D3C34] hover:scale-102 transition-transform">
                    <span className="text-[10px] text-[#0D3C34]/60 font-black">Tools Issued</span>
                    <p className="text-lg sm:text-xl font-black text-[#0D3C34]">32 Items Link</p>
                  </div>
                </div>

                {/* Simulated Chart Block */}
                <div className="bg-white border-2 border-[#0D3C34] rounded-xl p-4 flex-1 flex flex-col justify-between min-h-[140px] shadow-[3px_3px_0px_#0D3C34] relative overflow-hidden">
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                    <span>TEAM PRODUCTIVITY INDEX</span>
                    <span className="text-green-600 font-black">EXCELLENT +94.2%</span>
                  </div>
                  <div className="flex items-end justify-between h-20 px-2 pt-4">
                    <div className="w-[12%] bg-[#0D3C34]/20 rounded-t-md transition-all hover:bg-[#0D3C34]/40" style={{ height: '30%', animation: 'bar-grow 1s ease-out', '--target-height': '30%' }}></div>
                    <div className="w-[12%] bg-[#0D3C34]/20 rounded-t-md transition-all hover:bg-[#0D3C34]/40" style={{ height: '45%', animation: 'bar-grow 1s ease-out 0.1s', '--target-height': '45%' }}></div>
                    <div className="w-[12%] bg-[#0D3C34]/20 rounded-t-md transition-all hover:bg-[#0D3C34]/40" style={{ height: '60%', animation: 'bar-grow 1s ease-out 0.2s', '--target-height': '60%' }}></div>
                    <div className="w-[12%] bg-[#0D3C34]/20 rounded-t-md transition-all hover:bg-[#0D3C34]/40" style={{ height: '40%', animation: 'bar-grow 1s ease-out 0.3s', '--target-height': '40%' }}></div>
                    <div className="w-[12%] bg-[#0D3C34]/20 rounded-t-md transition-all hover:bg-[#0D3C34]/40" style={{ height: '75%', animation: 'bar-grow 1s ease-out 0.4s', '--target-height': '75%' }}></div>
                    <div className="w-[12%] bg-[#A3E635] rounded-t-md border-t-2 border-x-2 border-[#0D3C34] shadow-[1px_-1px_0px_#0D3C34]" style={{ height: '95%', animation: 'bar-grow 1s ease-out 0.5s', '--target-height': '95%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Small Bottom Features List */}
        <div className="max-w-4xl mx-auto mt-16 grid grid-cols-3 md:grid-cols-6 gap-4 text-center animate-fade-in delay-400">
          {[
            { label: 'Invoicing', detail: 'Real-time billing', icon: FileText },
            { label: 'Bills', detail: 'Outflow tracking', icon: CreditCard },
            { label: 'Tax', detail: 'Auto-calculations', icon: DollarSign },
            { label: 'Bank', detail: 'Direct feed feeds', icon: Globe },
            { label: 'Reports', detail: 'Fidelity logs', icon: FileSpreadsheet },
            { label: 'Payroll', detail: 'Salary runs', icon: Users }
          ].map((item, idx) => {
            const IconComponent = item.icon;
            return (
              <div key={idx} className="bg-white/40 border-2 border-[#0D3C34] py-4 px-2 rounded-2xl backdrop-blur-sm hover:scale-105 hover:bg-white/80 transition-all duration-300 shadow-[3px_3px_0px_#A3E635] hover:shadow-[4px_4px_0px_#A3E635] cursor-pointer flex flex-col items-center gap-1.5" onClick={handleActionRedirect}>
                <div className="w-8 h-8 rounded-lg bg-[#0D3C34]/5 flex items-center justify-center text-[#0D3C34]">
                  <IconComponent className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="font-extrabold text-xs sm:text-sm text-[#0D3C34]">{item.label}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5 leading-tight font-bold">{item.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. FEATURE HIGHLIGHTS */}
      <section id="features" className="py-20 bg-white border-y border-[#0D3C34]/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Visual Overlapping Card Box */}
            <div className="relative flex justify-center py-10 perspective-container">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#A3E635]/15 to-transparent rounded-full filter blur-3xl opacity-60"></div>
              
              {/* Primary Overlapping Card */}
              <div className="bg-[#F0FCF4] border-2 border-[#0D3C34] rounded-2xl p-6 shadow-xl w-72 relative z-10 -translate-x-6 sm:-translate-x-12 translate-y-6 hover:translate-y-4 hover:-translate-x-4 transition-transform duration-500">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-[#0D3C34]/60">Locker tool assigned</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                </div>
                <p className="text-[#0D3C34]/70 text-xs font-bold">Equipment Issued</p>
                <h4 className="text-xl font-black text-[#0D3C34] mt-1 mb-6">Hilti Rotary Drill <span className="text-xs font-bold block text-gray-400">ID: #HT-98</span></h4>
                <div className="flex gap-2">
                  <span onClick={handleActionRedirect} className="h-6 px-3 bg-[#A3E635] text-[#0D3C34] text-[10px] font-bold rounded-full flex items-center justify-center border border-[#0D3C34] cursor-pointer hover:bg-[#92cf2c] transition-colors">Return Log</span>
                  <span onClick={handleActionRedirect} className="h-6 px-3 bg-[#0D3C34]/5 text-[#0D3C34]/60 text-[10px] font-bold rounded-full flex items-center justify-center cursor-pointer hover:bg-[#0D3C34]/10 transition-colors">Remind</span>
                </div>
              </div>

              {/* Secondary Overlapping Card */}
              <div className="bg-white border-2 border-[#0D3C34] rounded-2xl p-6 shadow-2xl w-72 absolute z-20 translate-x-6 sm:translate-x-12 -translate-y-6 hover:translate-y-[-10px] hover:translate-x-[15px] transition-transform duration-500">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black text-[#0D3C34]">RGP Challan status</span>
                  <span className="bg-[#A3E635] text-[#0D3C34] text-[9px] font-black px-2 py-0.5 rounded-full border border-[#0D3C34] animate-pulse">Pushed</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center font-bold text-xs text-[#0D3C34] border border-[#0D3C34]/20">GP</div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#0F172A]">Challan #RGP-089</p>
                    <p className="text-[10px] text-gray-400">Outflow: Saya Gate 2</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description & List Column */}
            <div className="space-y-8">
              <h2 className="text-3xl sm:text-5xl font-black text-[#0D3C34] tracking-tight leading-tight">
                Scale up with hassle-free task tracking
              </h2>
              <p className="text-base sm:text-lg text-[#475569] leading-relaxed">
                Organize projects, assign checklist details to field engineers, check due dates, log material costs, and close loops effortlessly.
              </p>

              {/* Checks */}
              <div className="space-y-4">
                {[
                  { title: "Team task assignments", desc: "Issue checklists directly to team member PWAs with automated push alerts." },
                  { title: "Client enquiries & callbacks", desc: "Track sales pipelines, log callback remarks, and secure client deals." },
                  { title: "Gate pass challans (RGP)", desc: "Maintain structured logs for items moving in/out of site bounds." },
                  { title: "Locker tool reconciliation", desc: "Control tool assignments, register serials, and prevent equipment loss." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 hover:translate-x-1 transition-transform">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#A3E635]/25 border border-[#A3E635] flex items-center justify-center mt-1">
                      <Check className="w-3.5 h-3.5 text-[#0D3C34]" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-[#0D3C34]">{item.title}</h4>
                      <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <button 
                  onClick={handleActionRedirect}
                  className="bg-[#0D3C34] text-white font-bold text-base px-8 py-3.5 rounded-full hover:opacity-90 transition-all flex items-center gap-2 active:scale-95 border-2 border-[#0D3C34] shadow-[4px_4px_0px_#A3E635] hover:shadow-[5px_5px_0px_#A3E635]"
                >
                  Get started
                  <ArrowRight className="w-5 h-5 text-[#A3E635]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ROBUST GRID FEATURES */}
      <section className="py-20 bg-[#F0FCF4] relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#0D3C34] text-white rounded-[32px] p-8 sm:p-12 lg:p-16 border-2 border-[#0D3C34] shadow-2xl relative overflow-hidden">
            
            <div className="max-w-3xl mx-auto text-center mb-16 relative z-10">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight mb-6">
                Unlock your team's full potential with robust modules
              </h2>
              <p className="text-sm sm:text-base text-white/70 max-w-xl mx-auto font-medium">
                Ditch paper logs and spreadsheets. Track project activities, material gate passes, tool issues, and payroll reports inside one system.
              </p>
            </div>

            {/* Grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 perspective-container">
              {[
                { title: "Task Management", desc: "Assign custom checklists, record logs, and review progress sheets.", isLime: true, icon: FileText },
                { title: "Follow-Ups", desc: "Register client inquiries, set alerts, and manage pipelines.", isLime: false, icon: Calendar },
                { title: "Payment Logs", desc: "Track invoice dues, incoming payouts, and outgoing vendor costs.", isLime: true, icon: DollarSign },
                { title: "RGP Challan Tracker", desc: "Generate returnable gate passes and inspect items passing factory borders.", isLime: false, icon: FileSpreadsheet },
                { title: "Locker Tools", desc: "Monitor company equipment issues, reconcile kits, and view serial lists.", isLime: true, icon: Wrench },
                { title: "Salary Payouts", desc: "Compute attendance indices, register base salaries, and log pay slips.", isLime: false, icon: Layers }
              ].map((card, idx) => {
                const IconComponent = card.icon;
                return (
                  <div 
                    key={idx} 
                    className={`border-2 border-[#0D3C34] rounded-2xl p-6 sm:p-8 flex flex-col justify-between min-h-[200px] transition-all duration-300 hover:-translate-y-2 cursor-pointer ${
                      card.isLime 
                        ? 'bg-[#A3E635] text-[#0D3C34] shadow-[4px_4px_0px_#0D3C34] hover:shadow-[6px_6px_0px_#0D3C34]' 
                        : 'bg-white text-[#0D3C34] shadow-[4px_4px_0px_#0D3C34] hover:shadow-[6px_6px_0px_#0D3C34]'
                    }`}
                    onClick={handleActionRedirect}
                  >
                    <div className="space-y-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.isLime ? 'bg-[#0D3C34]/10' : 'bg-[#A3E635]/20'}`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-black">{card.title}</h3>
                      <p className={`text-xs sm:text-sm leading-relaxed font-semibold ${card.isLime ? 'text-[#0D3C34]/80' : 'text-gray-500'}`}>
                        {card.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 5. SAYA INDUSTRIAL AUTOMATION integration section (from sayaengineers.com) */}
      <section id="automation" className="py-20 bg-white border-b border-[#0D3C34]/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-[#0D3C34]/60 bg-[#A3E635]/20 px-3 py-1 rounded-full border-2 border-[#0D3C34]">SAYA Industrial Automation</span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#0D3C34] tracking-tight leading-tight mt-4 mb-6">
              Shop Floor Engineering Integration
            </h2>
            <p className="text-base sm:text-lg text-[#475569] leading-relaxed max-w-2xl mx-auto font-medium">
              We connect physical shop floor automation systems directly with Saya CRM database modules to provide end-to-end operational visibility.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {[
              {
                title: "Special Purpose Machines (SPM)",
                desc: "Connecting mechanical cycle runs and fault signals from custom industrial SPMs directly into supervisor task progress streams.",
                icon: Cpu
              },
              {
                title: "Vision Inspection Systems",
                desc: "Logging automated optical checks and dimensional traceability logs straight to database sheets for quality audits.",
                icon: Eye
              },
              {
                title: "CNC & PLC Modernization",
                desc: "Modern retrofitting of machine interfaces to sync live operating hours with PM schedule trackers in locker databases.",
                icon: Workflow
              }
            ].map((serv, idx) => {
              const IconComp = serv.icon;
              return (
                <div key={idx} className="bg-[#FAF9F5] border-2 border-[#0D3C34] rounded-2xl p-6 sm:p-8 shadow-[4px_4px_0px_#0D3C34] hover:shadow-[6px_6px_0px_#0D3C34] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-[#0D3C34] text-white flex items-center justify-center">
                      <IconComp className="w-5 h-5 text-[#A3E635]" />
                    </div>
                    <h4 className="text-lg font-black text-[#0D3C34]">{serv.title}</h4>
                    <p className="text-xs sm:text-sm text-gray-500 font-semibold leading-relaxed">{serv.desc}</p>
                  </div>
                  <div className="pt-6 border-t border-[#0D3C34]/10 mt-6">
                    <span onClick={handleActionRedirect} className="text-xs font-black text-[#0D3C34] hover:underline cursor-pointer flex items-center gap-1">
                      Configure Integration
                      <ArrowRight className="w-3 h-3 text-[#A3E635] transition-transform hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left text block */}
            <div className="space-y-6">
              <h2 className="text-2xl sm:text-4xl font-black text-[#0D3C34] tracking-tight leading-tight">
                Unified Ecosystem<br />& Custom Integrations
              </h2>
              <p className="text-base sm:text-lg text-[#475569] leading-relaxed max-w-lg font-medium">
                Sync data automatically between your field applications, local WhatsApp dispatchers, internal email systems, and company ledgers to avoid duplication.
              </p>
              <div className="pt-2">
                <button 
                  onClick={handleActionRedirect}
                  className="inline-flex items-center gap-2 bg-[#A3E635] text-[#0D3C34] font-black text-sm px-6 py-3 rounded-full hover:bg-[#92cf2c] transition-all shadow-[4px_4px_0px_#0D3C34] hover:shadow-[5px_5px_0px_#0D3C34] hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#0D3C34] border-2 border-[#0D3C34]"
                >
                  Request custom integration
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Node Layout visualization - Middle Logo node with connection lines */}
            <div className="relative w-full h-[320px] flex items-center justify-center bg-[#F0FCF4] rounded-3xl border-2 border-[#0D3C34] p-6 overflow-hidden shadow-[2px_2px_0px_#0D3C34]">
              <div className="absolute inset-0 bg-gradient-to-br from-[#A3E635]/5 to-transparent"></div>
              
              {/* Connection Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-[#0D3C34]/25 stroke-[2] animate-pulse-soft">
                <line x1="50%" y1="50%" x2="22%" y2="22%" className="animate-dash-scroll" style={{ strokeDasharray: '6 6', strokeDashoffset: 0 }} />
                <line x1="50%" y1="50%" x2="78%" y2="22%" className="animate-dash-scroll" style={{ strokeDasharray: '6 6', strokeDashoffset: 0 }} />
                <line x1="50%" y1="50%" x2="16%" y2="65%" className="animate-dash-scroll" style={{ strokeDasharray: '6 6', strokeDashoffset: 0 }} />
                <line x1="50%" y1="50%" x2="50%" y2="84%" className="animate-dash-scroll" style={{ strokeDasharray: '6 6', strokeDashoffset: 0 }} />
                <line x1="50%" y1="50%" x2="84%" y2="65%" className="animate-dash-scroll" style={{ strokeDasharray: '6 6', strokeDashoffset: 0 }} />
              </svg>

              {/* Central Logo Node */}
              <div className="absolute w-20 h-20 bg-white rounded-2xl border-4 border-[#0D3C34] flex items-center justify-center shadow-xl z-20 overflow-hidden transform hover:scale-110 hover:rotate-2 transition-transform cursor-pointer" onClick={handleActionRedirect}>
                <img src="/logo.jpg" alt="Saya Logo" className="w-full h-full object-cover" />
              </div>

              {/* Surrounding Nodes */}
              {/* WhatsApp API (Top-Left) */}
              <div onClick={handleActionRedirect} className="absolute left-[8%] top-[12%] bg-[#E8F5E9] text-[#2E7D32] border-2 border-[#2E7D32]/35 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black shadow-md z-10 hover:scale-105 hover:translate-y-[-2px] transition-all cursor-pointer">
                WhatsApp API
              </div>
              {/* Firebase Sync (Top-Right) */}
              <div onClick={handleActionRedirect} className="absolute right-[8%] top-[12%] bg-[#FFF3E0] text-[#E65100] border-2 border-[#E65100]/35 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black shadow-md z-10 hover:scale-105 hover:translate-y-[-2px] transition-all cursor-pointer">
                Firebase Sync
              </div>
              {/* Slack Alerts (Left-Mid) */}
              <div onClick={handleActionRedirect} className="absolute left-[3%] top-[55%] bg-[#F3E5F5] text-[#6A1B9A] border-2 border-[#6A1B9A]/35 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black shadow-md z-10 hover:scale-105 hover:translate-y-[-2px] transition-all cursor-pointer">
                Slack Alerts
              </div>
              {/* Google Sheets (Bottom-Mid) */}
              <div onClick={handleActionRedirect} className="absolute bottom-[8%] left-[33%] bg-[#E8F5E9] text-[#1B5E20] border-2 border-[#1B5E20]/35 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black shadow-md z-10 hover:scale-105 hover:translate-y-[-2px] transition-all cursor-pointer">
                Google Sheets
              </div>
              {/* Saya Invoicing (Right-Mid) */}
              <div onClick={handleActionRedirect} className="absolute right-[3%] top-[55%] bg-[#E1F5FE] text-[#0277BD] border-2 border-[#0277BD]/35 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black shadow-md z-10 hover:scale-105 hover:translate-y-[-2px] transition-all cursor-pointer">
                Saya Invoicing
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="py-20 bg-[#F0FCF4] relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-black text-[#0D3C34] tracking-tight leading-tight mb-4">
              Frequently asked questions?
            </h2>
            <p className="text-sm sm:text-base text-[#475569] font-medium">
              Everything you need to know about the Saya CRM system.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="border-2 border-[#0D3C34] rounded-xl overflow-hidden transition-all duration-300 bg-white shadow-[3px_3px_0px_#0D3C34] hover:shadow-[4px_4px_0px_#0D3C34]"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-black text-sm sm:text-base text-[#0D3C34] hover:bg-[#F0FCF4] transition-colors duration-250"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-5 h-5 text-[#A3E635]" /> : <ChevronDown className="w-5 h-5" />}
                  </button>

                  {isOpen && (
                    <div className="p-5 border-t-2 border-[#0D3C34] bg-[#F0FCF4]/10 text-xs sm:text-sm text-gray-600 leading-relaxed font-semibold transition-all">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIAL BANNER */}
      <section className="py-24 bg-[#0D3C34] text-white text-center relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#082420] opacity-40"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 space-y-8">
          
          <span className="text-[#A3E635] text-7xl font-serif leading-none block select-none mb-2 animate-float-slow">“</span>

          <p className="text-xl sm:text-3xl font-black tracking-tight leading-relaxed max-w-3xl mx-auto">
            "Switching to Saya CRM was the best decision for our operations team. It organized our tool locker inventories, speeded up our gate passes, and kept field workers fully reconciled."
          </p>

          <div className="space-y-1">
            <h4 className="font-extrabold text-sm sm:text-base text-[#A3E635]">Jane Doe</h4>
            <p className="text-xs text-white/60">Operations Supervisor at Saya Industrial</p>
          </div>
        </div>
      </section>

      {/* 7. LATEST BLOG POSTS */}
      <section id="blog" className="py-20 bg-[#F0FCF4] border-b border-[#0D3C34]/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl sm:text-5xl font-black text-[#0D3C34] tracking-tight leading-tight">
                Saya CRM Training Guides
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-2 font-black uppercase tracking-wider">
                Learn how to maximize work dispatching efficiency.
              </p>
            </div>
            {/* Arrow controllers placeholder */}
            <div className="flex gap-2">
              <span className="w-8 h-8 rounded-full border-2 border-[#0D3C34] flex items-center justify-center cursor-pointer hover:bg-white transition-all text-xs font-black select-none active:scale-95">{"<"}</span>
              <span className="w-8 h-8 rounded-full border-2 border-[#0D3C34] flex items-center justify-center cursor-pointer hover:bg-white transition-all text-xs font-black select-none active:scale-95">{">"}</span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Reconciling returnable materials gate pass audits.", category: "RGP GUIDE", author: "Sarah Jenkins" },
              { title: "Assigning and auditing tools in team locker slots.", category: "LOCKER AUDIT", author: "David Miller" },
              { title: "How to run pay calculations and download pay slips.", category: "PAYROLL", author: "Sarah Jenkins" },
              { title: "Using PWA offline sync on factory floors.", category: "PWA SYNC", author: "David Miller" }
            ].map((blog, idx) => (
              <div 
                key={idx} 
                onClick={handleActionRedirect}
                className="bg-[#A3E635] text-[#0D3C34] border-2 border-[#0D3C34] rounded-2xl p-6 flex flex-col justify-between min-h-[220px] shadow-[4px_4px_0px_#0D3C34] hover:shadow-[5px_5px_0px_#0D3C34] hover:translate-y-[-4px] transition-all duration-300 cursor-pointer"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black tracking-widest uppercase text-[#0D3C34]/60">
                    <BookOpen className="w-3.5 h-3.5" />
                    {blog.category}
                  </div>
                  <h3 className="text-lg font-black leading-snug">{blog.title}</h3>
                </div>
                
                <div className="flex justify-between items-center pt-6 border-t border-[#0D3C34]/10">
                  <span className="text-[10px] font-bold text-[#0D3C34]/80 font-mono">By {blog.author}</span>
                  <span className="text-xs font-black flex items-center gap-1 hover:underline">
                    Read
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. SUPPORT CONTACTS & DEVELOPER BLOCK */}
      <section id="support" className="py-20 bg-white relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-[#0D3C34]/60 bg-[#A3E635]/25 px-3 py-1 rounded-full border-2 border-[#0D3C34]">Operational Helpdesk</span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#0D3C34] tracking-tight mt-4 mb-4 animate-pulse-soft">
              We're here to help
            </h2>
            <p className="text-sm sm:text-base text-[#475569] font-medium max-w-xl mx-auto">
              Get direct technical assistance for your workspace dashboards or reach out to the corporate operations head.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Left Column: Developer Support (from SupportPage.jsx) */}
            <div className="bg-[#FAF9F5] border-2 border-[#0D3C34] rounded-2xl p-6 sm:p-8 shadow-[4px_4px_0px_#0D3C34] hover:shadow-[6px_6px_0px_#0D3C34] hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-3 border-b-2 border-[#0D3C34]/10 pb-4 mb-4">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-purple-200">
                    <HeartHandshake className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-purple-600 tracking-wider">Technical Developer</h3>
                    <h4 className="text-lg font-black text-[#0D3C34]">Rao Jatin</h4>
                    <p className="text-xs text-slate-500 font-semibold leading-none">Freelancer Full-Stack Developer</p>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-semibold">
                  For bug reports, layout styling feedback, network synchronization checks, and feature updates in the Saya CRM PWA, contact the developer directly.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <a
                  href="tel:9306018924"
                  className="flex items-center justify-center gap-2 h-12 bg-white hover:bg-gray-50 border-2 border-[#0D3C34] rounded-xl text-[#0D3C34] text-xs font-black shadow-[3px_3px_0px_#0D3C34] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#0D3C34] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#0D3C34] transition-all duration-200"
                >
                  <Phone size={14} className="text-[#0D3C34]" />
                  <span>Call Jatin</span>
                </a>
                <a
                  href="https://wa.me/919306018924"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-12 bg-emerald-50 hover:bg-emerald-100 border-2 border-[#2E7D32] rounded-xl text-[#2E7D32] text-xs font-black shadow-[3px_3px_0px_#2E7D32] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#2E7D32] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#2E7D32] transition-all duration-200"
                >
                  <MessageSquare size={14} className="text-[#2E7D32]" />
                  <span>WhatsApp Chat</span>
                </a>
              </div>
            </div>

            {/* Right Column: SAYA Industrial Corporate Support */}
            <div className="bg-[#FAF9F5] border-2 border-[#0D3C34] rounded-2xl p-6 sm:p-8 shadow-[4px_4px_0px_#0D3C34] hover:shadow-[6px_6px_0px_#0D3C34] hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-3 border-b-2 border-[#0D3C34]/10 pb-4 mb-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 border-2 border-blue-200 overflow-hidden">
                    <img src="/logo.jpg" alt="Saya Logo" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Corporate Office</h3>
                    <h4 className="text-lg font-black text-[#0D3C34]">SAYA Industrial Automation</h4>
                    <p className="text-xs text-slate-500 font-semibold leading-none">ISO 9001:2015 Certified Organization</p>
                  </div>
                </div>

                <div className="space-y-3 font-semibold text-xs sm:text-sm text-slate-600">
                  <div className="flex items-start gap-3 hover:translate-x-0.5 transition-transform">
                    <Mail size={16} className="text-[#0D3C34] flex-shrink-0 mt-0.5 animate-pulse-soft" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 leading-none">SALES & HELP MAIL</p>
                      <a href="mailto:sales@sayaengineers.com" className="text-[#0D3C34] font-black hover:underline mt-0.5 block">sales@sayaengineers.com</a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 hover:translate-x-0.5 transition-transform">
                    <Phone size={16} className="text-[#0D3C34] flex-shrink-0 mt-0.5 animate-pulse-soft" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 leading-none">OFFICE HELPLINE</p>
                      <a href="tel:+918824663257" className="text-[#0D3C34] font-black hover:underline mt-0.5 block">+91 88246 63257</a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 hover:translate-x-0.5 transition-transform">
                    <MapPin size={16} className="text-[#0D3C34] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 leading-none">Delhi NCR Offices</p>
                      <p className="text-[#0D3C34] font-black">Khushkhera, Manesar, Bhiwadi (Krish Icon Tapukara)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Website link */}
              <div>
                <a
                  href="https://sayaengineers.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 h-12 bg-[#A3E635] hover:bg-[#92cf2c] border-2 border-[#0D3C34] rounded-xl text-[#0D3C34] text-xs font-black shadow-[3px_3px_0px_#0D3C34] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#0D3C34] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#0D3C34] transition-all duration-200"
                >
                  <Globe size={14} className="text-[#0D3C34]" />
                  <span>Visit sayaengineers.com</span>
                  <ExternalLink size={12} className="text-[#0D3C34]" />
                </a>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 12. FOOTER */}
      <footer className="bg-[#0D3C34] text-white pt-20 pb-12 overflow-hidden border-t border-[#0D3C34]/20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
            
            {/* Info Block */}
            <div className="col-span-2 space-y-6">
              <div className="flex items-center gap-2.5">
                <img src="/logo.jpg" alt="Saya Logo" className="w-8 h-8 rounded-lg border border-white/10" />
                <span className="text-xl font-black tracking-tighter">saya crm</span>
              </div>
              <p className="text-xs text-white/60 leading-relaxed max-w-sm font-semibold">
                Unified workspace built for task boards, follow-ups, payment records, returnable gate pass tracking, and team locker tools.
              </p>
            </div>

            {/* Links Columns */}
            {[
              {
                title: "Modules",
                links: ["Tasks", "Follow-ups", "Payments", "Locker Tools"]
              },
              {
                title: "Saya Team",
                links: ["Careers", "Press Kit", "Contact Support"]
              },
              {
                title: "Resources",
                links: ["FAQ Portal", "Guides", "API Docs"]
              }
            ].map((col, idx) => (
              <div key={idx} className="space-y-4">
                <h4 className="font-extrabold text-xs tracking-wider uppercase text-[#A3E635]">{col.title}</h4>
                <ul className="space-y-2.5 text-xs text-white/60 font-semibold">
                  {col.links.map((link, lIdx) => (
                    <li key={lIdx}>
                      <a href={`#${link.toLowerCase().replace(' ', '').replace('-', '')}`} className="hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <hr className="border-white/10 my-10" />

          {/* Giant Brutalist Logo */}
          <div className="relative pointer-events-none select-none my-6">
            <h1 className="text-[12vw] font-black tracking-tighter text-center leading-none text-white/5 uppercase select-none">
              SAYA
            </h1>
          </div>

          {/* Bottom metadata */}
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-white/40 gap-4 pt-4 font-semibold">
            <p>© 2026 Saya CRM (Saya Industrial Group). All rights reserved.</p>
            <p>Designed with neobrutal elements by Antigravity.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
