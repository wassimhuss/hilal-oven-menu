'use client';
import { useEffect, useSyncExternalStore } from 'react';
import type { Language } from './menu';
const eventName = 'hilal-language-change';
let fallback: Language = 'en';
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(eventName, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(eventName, callback);
  };
}
function snapshot(): Language {
  try {
    const value = localStorage.getItem('hilal-language');
    return value === 'ar' || value === 'en' ? value : fallback;
  } catch {
    return fallback;
  }
}
function setLanguage(lang: Language) {
  fallback = lang;
  try {
    localStorage.setItem('hilal-language', lang);
  } catch {}
  window.dispatchEvent(new Event(eventName));
}
export function useLanguage() {
  const lang = useSyncExternalStore(
    subscribe,
    snapshot,
    () => 'en' as Language,
  );
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  return [lang, setLanguage] as const;
}
