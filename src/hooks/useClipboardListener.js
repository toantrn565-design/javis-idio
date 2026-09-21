import { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';

export function useClipboardListener({ onClipboardDetected, enabled = true }) {
  const [copiedContent, setCopiedContent] = useState('');
  const lastClipboardTextRef = useRef('');

  useEffect(() => {
    if (!enabled) return;

    const checkClipboard = async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.readText) return;
        
        // Chỉ đọc khi tab đang active
        if (document.visibilityState !== 'visible') return;

        const text = await navigator.clipboard.readText();
        if (text && text.trim() && text.trim() !== lastClipboardTextRef.current && text.trim().length > 1) {
          lastClipboardTextRef.current = text.trim();
          setCopiedContent(text.trim());
          if (onClipboardDetected) {
            onClipboardDetected(text.trim());
          }
        }
      } catch {
        // Trình duyệt có thể yêu cầu quyền hoặc đang blur
      }
    };

    // Kiểm tra khi người dùng quay lại app (Focus/Visibility)
    window.addEventListener('focus', checkClipboard);
    document.addEventListener('visibilitychange', checkClipboard);

    return () => {
      window.removeEventListener('focus', checkClipboard);
      document.removeEventListener('visibilitychange', checkClipboard);
    };
  }, [enabled, onClipboardDetected]);

  return { copiedContent, clearCopiedContent: () => setCopiedContent('') };
}
