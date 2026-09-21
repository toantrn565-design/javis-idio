export function detectLanguage(text) {
  if (!text || text.trim() === '') return 'unknown';

  // 1. Japanese (Hiragana, Katakana)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    return 'ja';
  }

  // 2. Chinese (Han characters but not Japanese Kana)
  if (/[\u4E00-\u9FFF]/.test(text)) {
    // If it has Kanji but no Kana, it could be Chinese or Japanese.
    // Usually, typical Japanese sentences have particles (の, は, が, を, に, です, ます) which are Hiragana.
    // If only Han characters, we default to Chinese in this app context unless it's a specific Japanese Kanji only string.
    return 'zh';
  }

  // 3. Vietnamese (Vietnamese diacritics)
  const viRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  if (viRegex.test(text)) {
    return 'vi';
  }

  // 4. English (Latin alphabet without Vietnamese diacritics)
  const enRegex = /^[a-zA-Z0-9\s.,!?'"()-]+$/;
  if (enRegex.test(text)) {
    return 'en';
  }

  return 'unknown';
}
