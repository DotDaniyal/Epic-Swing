import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
  onAction?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  compact = false,
  onAction,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => {
          onAction?.();
          install();
        }}
        className={`flex items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/15 font-medium text-cyan-200 transition-colors hover:bg-cyan-500/25 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer ${
          compact ? 'min-h-[44px] px-3 text-xs' : 'min-h-[44px] px-4 py-2.5 text-sm'
        }`}
      >
        <Download className="w-4 h-4 text-cyan-400" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            onAction?.();
            setShowIOSGuide(true);
          }}
          className={`flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#0E1729] font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-white active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer ${
            compact ? 'min-h-[44px] px-3 text-xs' : 'min-h-[44px] px-4 py-2.5 text-sm'
          }`}
        >
          <Share className="w-4 h-4 text-cyan-400" />
          <span>Add to Home Screen</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-[#0B1324] p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">
                  Install EPIC SWING
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Play full-screen offline on iPhone or iPad:
              </p>
              <ol className="mt-3 space-y-2 text-sm text-slate-200">
                <li>1. Tap the Share icon in the Safari toolbar.</li>
                <li>2. Scroll down and select Add to Home Screen.</li>
                <li>3. Launch EPIC SWING from your home screen.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full min-h-[44px] rounded-lg bg-cyan-500 font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
