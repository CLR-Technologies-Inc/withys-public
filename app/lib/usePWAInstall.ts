import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

// ── Module-level cache ──────────────────────────────────────────────────────
// The beforeinstallprompt event fires ONCE, often before React mounts.
// Cache it globally so the hook can pick it up on first render.
let _cachedPromptEvent: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    _cachedPromptEvent = e;
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(_cachedPromptEvent);
  const [isInstallable, setIsInstallable] = useState(!!_cachedPromptEvent);
  const [isIOSWeb, setIsIOSWeb] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Detect iOS web
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    
    // Check if already in standalone mode
    const isStandalone = ('standalone' in window.navigator && (window.navigator as any).standalone) || 
                          window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
      setIsIOSWeb(true);
    }

    // If the event was already cached before mount, pick it up
    if (_cachedPromptEvent && !deferredPrompt) {
      setDeferredPrompt(_cachedPromptEvent);
      setIsInstallable(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      _cachedPromptEvent = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      _cachedPromptEvent = null;
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsIOSWeb(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const promptInstall = async () => {
    const prompt = deferredPrompt || _cachedPromptEvent;
    if (!prompt) return;
    
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    _cachedPromptEvent = null;
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return { isInstallable, isIOSWeb, promptInstall };
}
