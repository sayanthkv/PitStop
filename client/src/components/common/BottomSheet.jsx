import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function BottomSheet({ isOpen, onClose, title, children, showClose = true }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-carbon-900 border-t border-carbon-700 rounded-t-2xl max-h-[90vh] flex flex-col pb-safe shadow-2xl"
          >
            {/* Grab handle bar */}
            <div className="w-12 h-1.5 bg-carbon-700 rounded-full mx-auto my-2.5 opacity-80" />

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 py-2 border-b border-carbon-800">
                <h3 className="font-display font-bold text-base text-zinc-100 uppercase tracking-wide">
                  {title}
                </h3>
                {showClose && (
                  <button
                    onClick={onClose}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-carbon-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Scrollable content body */}
            <div className="p-5 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
