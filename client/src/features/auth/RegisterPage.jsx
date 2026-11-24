import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.jsx';
import { APP_CONFIG } from '../../lib/constants.js';
import { ShieldCheck, User, Mail, Lock, ArrowRight, AlertTriangle } from 'lucide-react';

export function RegisterPage({ onNavigateLogin }) {
  const { register, canRegister, hasOwner } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register(name, email, password);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (hasOwner && !canRegister) {
    return (
      <div className="min-h-screen bg-carbon-950 flex flex-col justify-center px-4 py-8 max-w-sm mx-auto text-center">
        <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-6 shadow-xl">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg text-zinc-100 uppercase tracking-wide">
            Registration Locked
          </h3>
          <p className="text-xs text-zinc-400 font-sans mt-2 mb-4 leading-relaxed">
            This deployment of {APP_CONFIG.name} is configured for a single owner and already has an account registered.
          </p>
          <button
            onClick={onNavigateLogin}
            className="w-full py-2.5 rounded-xl bg-amber-500 text-carbon-950 font-bold text-xs"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-carbon-950 flex flex-col justify-center px-4 py-8 max-w-sm mx-auto">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-carbon-950 font-display font-black text-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-500/20">
          N
        </div>
        <h2 className="font-display font-bold text-2xl text-zinc-100 uppercase tracking-wider">
          Owner Setup
        </h2>
        <p className="text-xs text-zinc-400 font-sans mt-1">
          First-run setup: Create the primary owner account
        </p>
      </div>

      <div className="bg-carbon-900 border border-carbon-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>This account will become the permanent single owner.</span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Owner Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rider Name"
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>
          </div>

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
                placeholder="rider@example.com"
                className="w-full bg-carbon-950 border border-carbon-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-zinc-400 mb-1">
              Password (min 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
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
            {isLoading ? 'Creating Account...' : 'Continue to Vehicle Setup'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={onNavigateLogin}
          className="text-xs text-zinc-400 hover:text-zinc-200 font-mono transition"
        >
          Already registered? Login &rarr;
        </button>
      </div>
    </div>
  );
}
