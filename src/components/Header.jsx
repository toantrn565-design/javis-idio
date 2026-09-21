import { Sparkles, Zap, ShieldCheck } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-30 bg-[#0b1120]/80 backdrop-blur-xl border-b border-white/[0.08] shadow-2xl py-3 px-4 transition-all">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Left: Logo + App Name */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur-xs opacity-70"></div>
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-black p-1.5 border border-white/20 shadow-inner flex items-center justify-center">
              <img src="/favicon.svg" alt="JAVIS Idio Logo" className="w-full h-full object-contain filter drop-shadow" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white font-['Outfit']">JAVIS Idio</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-600 text-slate-950 shadow-sm shadow-amber-500/20">
                PREMIUM
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 leading-none mt-0.5">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Gõ Giọng Nói & Dịch Đàm Thoại 2 Chiều</span>
            </p>
          </div>
        </div>

        {/* Right: Engine Status Badge */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Siêu Tốc 0.01s</span>
          </div>
        </div>
      </div>
    </header>
  );
}
