import { useState } from 'react';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { usePwa } from '../../hooks/usePwa.js';
import { APP_CONFIG } from '../../lib/constants.js';

export function InstallPrompt() {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePwa();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (isInstalled || isDismissed) return null;

  return (
    <>
      {isInstallable && (
        <div className="mx-4 my-2 p-3 bg-carbon-900 border border-amber-500/30 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-carbon-950 flex items-center justify-center font-bold text-xs font-display">
              PWA
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-100 font-display">Install {APP_CONFIG.shortName}</p>
              <p className="text-[10px] text-zinc-400">Add to home screen for fullscreen dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={promptInstall}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-carbon-950 text-xs font-bold font-sans flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Install
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200"
              aria-label="Dismiss install banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isIOS && !isInstallable && (
        <div className="mx-4 my-2 p-3 bg-carbon-900/90 border border-carbon-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-zinc-200 font-display">Install on iOS</p>
            <p className="text-[10px] text-zinc-400">Tap Share, then &quot;Add to Home Screen&quot;</p>
          </div>
          <button
            onClick={() => setShowIosGuide(true)}
            className="px-2.5 py-1 rounded bg-carbon-800 text-zinc-300 text-xs font-mono border border-carbon-700"
          >
            How-to
          </button>
        </div>
      )}

      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center p-4">
          <div className="bg-carbon-900 border border-carbon-700 rounded-2xl p-5 max-w-sm w-full mb-6">
            <h4 className="font-display font-bold text-base text-zinc-100 mb-2">
              Install on iOS Safari
            </h4>
            <ol className="text-xs text-zinc-300 space-y-2.5 mb-4 list-decimal list-inside font-sans">
              <li>
                Tap the <Share2 className="w-3.5 h-3.5 inline text-amber-400" /> <strong>Share</strong> button in Safari toolbar.
              </li>
              <li>
                Scroll down and select <PlusSquare className="w-3.5 h-3.5 inline text-amber-400" /> <strong>Add to Home Screen</strong>.
              </li>
              <li>Tap <strong>Add</strong> in the top right corner.</li>
            </ol>
            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2 rounded-xl bg-amber-500 text-carbon-950 font-bold text-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
