import { useEffect, useState } from 'react';

export const usePWAInstall = () => {
  const [prompt, setPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));

    // If currently running as installed standalone PWA, mark installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      // Browser fires this only when app is NOT installed — clear any stale flags
      localStorage.removeItem('pwa-banner-dismissed');
      localStorage.removeItem('pwa-installed');
      setPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setPrompt(null);
  };

  return { canInstall: !!prompt, isInstalled, isIOS, install };
};
