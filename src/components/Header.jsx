import { Sparkles, Mic } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-teal-800 via-teal-700 to-emerald-600 text-white p-4 shadow-lg rounded-b-3xl">
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-2xl font-extrabold flex items-center justify-center gap-2 tracking-wide">
          <span className="bg-yellow-400 text-teal-950 px-2 py-0.5 rounded-lg text-sm font-black shadow-xs">YAP</span>
          AI Voice & Translator
        </h1>
        <p className="text-xs text-teal-100 mt-1 font-medium flex items-center justify-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Gõ giọng nói chuẩn hóa & Dịch thuật hội thoại 2 chiều
        </p>
      </div>
    </header>
  );
}
