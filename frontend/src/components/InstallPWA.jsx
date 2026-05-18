import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

const InstallPWA = ({ className = '' }) => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setSupportsPWA(true);
      setPromptInstall(e);
    };
    
    // Listen for the prompt
    window.addEventListener('beforeinstallprompt', handler);

    // Some browsers might emit appinstalled when it's done
    window.addEventListener('appinstalled', () => {
      setSupportsPWA(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const onClick = async (evt) => {
    evt.preventDefault();
    if (!promptInstall) return;

    promptInstall.prompt();
    
    const { outcome } = await promptInstall.userChoice;
    
    if (outcome === 'accepted') {
      setSupportsPWA(false);
    }
  };

  if (!supportsPWA) {
    return null; // Button won't show if app is already installed or browser doesn't support it
  }

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 ${className}`}
      onClick={onClick}
      title="Install as a desktop or mobile app"
    >
      <Download size={16} />
      Install App
    </button>
  );
};

export default InstallPWA;
