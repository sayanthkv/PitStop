import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { APP_CONFIG } from '../../lib/constants.js';
import { Lock, Mail, ArrowRight, ShieldAlert } from 'lucide-react';

export function LoginPage({ onNavigateRegister }) {
  const { login, canRegister, hasOwner } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-carbon-950 flex flex-col justify-center px-4 py-8 max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-carbon-950 font-display font-black text-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20 border-2 border-carbon-900">
          N
        </div>
        <h2 className="font-display font-bold text-2xl text-zinc-100 uppercase tracking-wider">
          {APP_CONFIG.name}
        </h2>
        <p className="text-xs text-zinc-400 font-sans mt-1">
          Personal Cockpit & Telemetry for TVS NTORQ
        </p>
      </div>

      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-6 shadow-xl">
        <h3 className="font-display font-semibold text-base text-zinc-200 mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-500" /> Owner Login
        </h3>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-carbon-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition disabled:opacity-50"
          >
            {isLoading ? 'Accessing...' : 'Enter Cockpit'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {(!hasOwner || canRegister) && (
        <div className="mt-6 text-center">
          <button
            onClick={onNavigateRegister}
            className="text-xs text-amber-400 hover:text-amber-300 font-mono transition"
          >
            First time? Set up Owner Account &rarr;
          </button>
        </div>
      )}
    </div>
  );
}
