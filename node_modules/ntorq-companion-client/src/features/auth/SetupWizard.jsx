import { useState } from 'react';
import { useVehicle } from '../../hooks/useVehicle.js';
import { APP_CONFIG } from '../../lib/constants.js';
import { Check } from 'lucide-react';

export function SetupWizard({ onComplete }) {
  const { setupVehicle } = useVehicle();
  const [formData, setFormData] = useState({
    nickname: 'My NTORQ',
    model: APP_CONFIG.defaultModel,
    year: 2023,
    registrationNumber: '',
    fuelType: 'Petrol',
    tankCapacity: APP_CONFIG.defaultTankCapacity, // user entered, not strictly hardcoded
    reserveLevel: APP_CONFIG.defaultReserveLevel, // default 1.0 L
    purchaseDate: new Date().toISOString().slice(0, 10),
    currentOdometer: 0,
    photoUrl: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.registrationNumber) {
      setError('Registration number is required.');
      return;
    }

    if (!formData.tankCapacity || Number(formData.tankCapacity) <= 0) {
      setError('Please enter a valid tank capacity in litres.');
      return;
    }

    setIsLoading(true);
    try {
      await setupVehicle(formData);
      if (onComplete) onComplete();
    } catch (err) {
      setError(err.message || 'Failed to save vehicle details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-carbon-950 py-10 px-4 max-w-md mx-auto">
      <div className="text-center mb-6">
        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
          Step 2 of 2
        </span>
        <h2 className="font-display font-bold text-2xl text-zinc-100 uppercase tracking-wide mt-3">
          Configure Your Scooter
        </h2>
        <p className="text-xs text-zinc-400 font-sans mt-1">
          Set up your NTORQ telemetry parameters
        </p>
      </div>

      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-6 shadow-xl">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Scooter Nickname
            </label>
            <input
              type="text"
              required
              value={formData.nickname}
              onChange={(e) => handleChange('nickname', e.target.value)}
              placeholder="e.g. Thunder 125"
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Model Variant
              </label>
              <input
                type="text"
                required
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Model Year
              </label>
              <input
                type="number"
                min="2015"
                max="2035"
                required
                value={formData.year}
                onChange={(e) => handleChange('year', Number(e.target.value))}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Registration Number
            </label>
            <input
              type="text"
              required
              value={formData.registrationNumber}
              onChange={(e) => handleChange('registrationNumber', e.target.value.toUpperCase())}
              placeholder="e.g. KA01AB1234"
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-amber-400 font-mono uppercase tracking-wider focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Tank Capacity (L)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="20"
                required
                value={formData.tankCapacity}
                onChange={(e) => handleChange('tankCapacity', Number(e.target.value))}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">NTORQ spec: ~5.8L</span>
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
                Reserve Level (L)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.2"
                max="5"
                required
                value={formData.reserveLevel}
                onChange={(e) => handleChange('reserveLevel', Number(e.target.value))}
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Default: 1.0L</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Current Odometer (km)
            </label>
            <input
              type="number"
              min="0"
              required
              value={formData.currentOdometer}
              onChange={(e) => handleChange('currentOdometer', Number(e.target.value))}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => handleChange('purchaseDate', e.target.value)}
              className="w-full bg-carbon-950 border border-carbon-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-carbon-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition disabled:opacity-50"
          >
            {isLoading ? 'Saving Scooter...' : 'Initialize Cockpit'} <Check className="w-4 h-4 stroke-[3]" />
          </button>
        </form>
      </div>
    </div>
  );
}
