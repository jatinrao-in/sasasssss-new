import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, MessageSquare, Mail, Globe, MapPin, 
  HeartHandshake, HelpCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function SupportPage() {
  const navigate = useNavigate();
  const { userData } = useAuth();

  return (
    <div 
      className="min-h-screen font-sans pb-24 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #FAF6EE 0%, #EAE4D9 100%)' }}
    >
      {/* Background Wave */}
      <svg className="absolute bottom-0 left-0 right-0 w-full h-[200px] pointer-events-none z-0 opacity-40" viewBox="0 0 1440 320" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <path d="M0,280 C150,280 200,200 420,200 C640,200 700,320 1020,320 C1220,320 1350,220 1440,200 L1440,320 L0,320 Z" fill="#DFD8CC" />
        <path d="M0,120 C100,120 100,260 320,260 C520,260 720,220 920,220 C1120,220 1220,320 1440,320 L1440,320 L0,320 Z" fill="#EFECE4" />
      </svg>

      <div className="relative z-10 space-y-4 px-4">
        {/* Header */}
        <div className="pt-5 pb-2 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FAF6EE] border border-[#DFD5C6] rounded-xl flex items-center justify-center text-[#A68F6D] shadow-sm">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-[20px] font-black text-slate-800 tracking-tight leading-none">Support & Help</h1>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Get assist with your industrial PWA dashboard</p>
          </div>
        </div>

        {/* Developer Support Card */}
        <div className="bg-[#F2ECE1] border border-[#DFD5C6] p-5 rounded-[28px] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <HeartHandshake size={22} className="stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase text-purple-600 tracking-wider">Technical Support</h3>
              <h4 className="text-sm font-black text-slate-800 leading-tight">Rao Jatin</h4>
              <p className="text-[10px] text-slate-500 font-medium leading-none">Freelancer Full-Stack Developer</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            If you are facing any bugs, layout issues, network sync errors, or have customization feedback, contact the developer directly.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <a
              href="tel:9306018924"
              className="flex items-center justify-center gap-1.5 h-11 bg-[#F2ECE1] hover:bg-[#EAE4D9] active:scale-95 transition-all border border-[#DFD5C6] rounded-2xl text-slate-800 text-xs font-bold shadow-sm"
            >
              <Phone size={14} className="text-purple-600" />
              <span>Call Support</span>
            </a>
            <a
              href={`https://wa.me/919306018924?text=Hi%20Jatin,%20I'm%20facing%20an%20issue%20with%20the%20Saya%20PWA%20App.%20My%20user%20name%20is%20${encodeURIComponent(userData?.name || '')}.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 h-11 bg-emerald-50 hover:bg-emerald-100 active:scale-95 transition-all border border-emerald-100 rounded-2xl text-emerald-800 text-xs font-bold shadow-sm"
            >
              <MessageSquare size={14} className="text-emerald-600" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Company Details Card */}
        <div className="bg-[#F2ECE1] border border-[#DFD5C6] p-5 rounded-[28px] shadow-sm space-y-4 border-t border-[#DFD5C6]">
          <div className="border-b border-[#DFD5C6] pb-3">
            <h3 className="text-[10px] font-black uppercase text-[#1a73e8] tracking-wider">Company Information</h3>
            <h4 className="text-sm font-black text-slate-800 tracking-tight mt-1">SAYA Industrial Automation Pvt. Ltd.</h4>
            <p className="text-[10px] text-slate-500 italic mt-0.5">"Vision to provide the best industry solutions"</p>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#F2ECE1] border border-[#DFD5C6] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail size={14} className="text-[#A68F6D]" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Sales & Support Mail</p>
                <a href="mailto:sales@sayaengineers.com" className="text-xs font-bold text-[#1a73e8] hover:underline mt-0.5 block">sales@sayaengineers.com</a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#F2ECE1] border border-[#DFD5C6] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Phone size={14} className="text-[#A68F6D]" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Office Helpline</p>
                <a href="tel:+918824663257" className="text-xs font-bold text-slate-800 hover:underline mt-0.5 block">+91 88246 63257</a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#F2ECE1] border border-[#DFD5C6] flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin size={14} className="text-[#A68F6D]" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Headquarters & Service Centers</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">Khushkhera & Manesar (Delhi NCR), Bhiwadi</p>
                <p className="text-[10px] text-slate-500 leading-tight">ISO 9001:2015 Certified Organization</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#F2ECE1] border border-[#DFD5C6] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Globe size={14} className="text-[#A68F6D]" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">Official Website</p>
                <a 
                  href="https://sayaengineers.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs font-bold text-[#1a73e8] hover:underline flex items-center gap-0.5 mt-0.5"
                >
                  sayaengineers.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
