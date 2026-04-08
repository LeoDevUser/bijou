import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useLanguage, type Language } from '../context/LanguageContext';
import { api } from '../api/client';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      const profile = await api.account.getProfile();
      const preferred = profile.language.toLowerCase() as Language;
      if (preferred !== language) setLanguage(preferred);
      navigate('/');
    } catch (err) {
      const e = err as { code?: string };
      setError(e.code ?? t('auth.error'));
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full border border-border bg-cream px-4 py-3 text-sm outline-none focus:border-dark transition-colors';

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-4xl font-light text-center mb-1">{t('auth.login')}</h1>
        <p className="text-center text-muted text-sm mb-10">{t('auth.loginSubtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('auth.email')}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('auth.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-dark text-white text-xs uppercase tracking-widest py-4 hover:bg-gold transition-colors disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? '...' : t('auth.signIn')}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-8">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-dark underline hover:text-gold transition-colors">
            {t('auth.signUp')}
          </Link>
        </p>
      </div>
    </div>
  );
}
