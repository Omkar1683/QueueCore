import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import { LogIn, Layers } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 shadow-lg shadow-brand-600/30 mb-4">
            <Layers size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">QueueCore</h1>
          <p className="text-slate-500 text-sm mt-1">Queue Management Platform</p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address</label>
              <input id="email" type="email" autoComplete="email" required
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="input-field" placeholder="admin@queuecore.io" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <input id="password" type="password" autoComplete="current-password" required
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="input-field" placeholder="••••••••" />
            </div>
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                {error}
              </div>
            )}
            <button id="login-btn" type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-2">
              {loading ? <><Spinner size={16} />Signing in...</> : <><LogIn size={16} />Sign In</>}
            </button>
          </form>
          <p className="text-center text-xs text-slate-600 mt-6">
            First user registered automatically becomes admin
          </p>
        </div>
      </div>
    </div>
  );
}
