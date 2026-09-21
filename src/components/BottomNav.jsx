import { Mic, Languages, Users, Sparkles, History as HistoryIcon, Settings as SettingsIcon } from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dictate', label: 'Gõ giọng nói', icon: Mic },
    { id: 'translate', label: 'Đàm thoại', icon: Languages },
    { id: 'meeting', label: 'Phòng họp AI', icon: Users },
    { id: 'chat', label: 'Trợ lý AI', icon: Sparkles },
    { id: 'settings', label: 'Cài đặt', icon: SettingsIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 p-2 sm:p-3 pointer-events-none">
      <div className="max-w-md md:max-w-xl mx-auto pointer-events-auto">
        <div className="bg-[#0b1120]/90 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'text-emerald-400 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-teal-500/10 rounded-2xl border border-emerald-500/30 -z-10 shadow-[0_0_15px_rgba(16,185,129,0.25)]"></div>
                )}
                <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]' : ''}`} />
                <span className="text-[10px] mt-1 tracking-tight leading-none whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
