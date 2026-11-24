import { Delete, Check } from 'lucide-react';

export function NumericKeypad({ value, onChange, onSubmit, label = 'Enter Value', unit = '', max = 999999 }) {
  const handleKey = (digit) => {
    const str = String(value || '');
    if (digit === '.' && str.includes('.')) return;
    if (str.length >= 8) return;
    const nextVal = str === '0' && digit !== '.' ? String(digit) : str + digit;
    if (Number(nextVal) <= max) {
      onChange(nextVal);
    }
  };

  const handleBackspace = () => {
    const str = String(value || '');
    if (str.length <= 1) {
      onChange('');
    } else {
      onChange(str.slice(0, -1));
    }
  };

  const handleClear = () => {
    onChange('');
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'];

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      {/* Display screen */}
      <div className="w-full bg-carbon-950 border border-carbon-800 rounded-xl p-4 mb-4 text-center">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
          {label}
        </span>
        <div className="flex items-baseline justify-center gap-1">
          <span className="font-mono text-3xl font-bold tracking-wider text-amber-400 tabular-nums min-h-[40px]">
            {value || '0'}
          </span>
          {unit && <span className="font-mono text-sm text-zinc-400">{unit}</span>}
        </div>
      </div>

      {/* 3x4 Keypad Grid */}
      <div className="grid grid-cols-3 gap-2 w-full mb-4">
        {keys.map((k) => {
          if (k === 'backspace') {
            return (
              <button
                key="backspace"
                type="button"
                onClick={handleBackspace}
                className="h-14 rounded-xl bg-carbon-800/80 active:bg-carbon-700 text-zinc-300 flex items-center justify-center border border-carbon-700 transition active:scale-95 text-lg"
                aria-label="Backspace"
              >
                <Delete className="w-5 h-5" />
              </button>
            );
          }

          return (
            <button
              key={k}
              type="button"
              onClick={() => handleKey(k)}
              className="h-14 rounded-xl bg-carbon-800 active:bg-carbon-700 text-zinc-100 font-mono text-xl font-bold border border-carbon-700 transition active:scale-95 shadow-sm"
            >
              {k}
            </button>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2 w-full">
        <button
          type="button"
          onClick={handleClear}
          className="py-3 px-4 rounded-xl bg-carbon-800 text-zinc-400 font-medium text-sm border border-carbon-700 hover:text-zinc-200 transition"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value || Number(value) <= 0}
          className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 disabled:opacity-40 text-carbon-950 font-bold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-98 transition"
        >
          <Check className="w-4 h-4 stroke-[3]" /> Confirm
        </button>
      </div>
    </div>
  );
}
