import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import VoiceDictation from './components/VoiceDictation';
import Translator from './components/Translator';
import AiChat from './components/AiChat';
import History from './components/History';
import SettingsScreen from './components/Settings';
import { useLocalStorage } from './hooks/useLocalStorage';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  const [activeTab, setActiveTab] = useState('dictate');
  const [history, setHistory] = useLocalStorage('yap-history', []);
  const [settings, setSettings] = useLocalStorage('yap-settings', {
    defaultPair: 'vi-en',
    translationMode: 'auto',
    autoSpeak: true,
    autoCopy: true,
    defaultRefineMode: 'exact',
    saveHistory: true,
  });

  useEffect(() => {
    const handleOffline = () => toast.error("Đã mất kết nối mạng! Vui lòng kiểm tra lại Internet.", { duration: Infinity, id: 'offline' });
    const handleOnline = () => {
      toast.dismiss('offline');
      toast.success("Đã kết nối mạng trở lại!");
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    if (!navigator.onLine) handleOffline();

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dictate':
        return <VoiceDictation history={history} setHistory={setHistory} settings={settings} />;
      case 'translate':
        return <Translator history={history} setHistory={setHistory} settings={settings} />;
      case 'chat':
        return <AiChat />;
      case 'history':
        return <History history={history} setHistory={setHistory} />;
      case 'settings':
        return <SettingsScreen settings={settings} setSettings={setSettings} />;
      default:
        return <VoiceDictation history={history} setHistory={setHistory} settings={settings} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col font-sans relative antialiased selection:bg-emerald-500 selection:text-white overflow-hidden">
        {/* Luxury Background Glow Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-900/10 rounded-full blur-[120px] pointer-events-none -z-10"></div>

        <Toaster 
          position="top-center" 
          toastOptions={{ 
            duration: 2500, 
            style: { 
              borderRadius: '16px', 
              background: '#0f172a', 
              color: '#f8fafc', 
              border: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '13px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            } 
          }} 
        />

        <Header />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full z-10">
          {renderContent()}
        </main>

        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </ErrorBoundary>
  );
}
