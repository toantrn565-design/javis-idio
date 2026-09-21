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
      <div className="min-h-screen bg-gray-50 flex flex-col pb-20 font-sans relative antialiased selection:bg-teal-500 selection:text-white">
        <Toaster position="top-center" toastOptions={{ duration: 2500, style: { borderRadius: '12px', background: '#1e293b', color: '#fff', fontSize: '13px' } }} />
        <Header />
        <main className="flex-1 overflow-y-auto p-4 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full">
          {renderContent()}
        </main>
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </ErrorBoundary>
  );
}
