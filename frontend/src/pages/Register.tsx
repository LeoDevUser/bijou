import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useLanguage, type Language } from '../context/LanguageContext';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
];

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', address: '', city: '', postalCode: '', country: 'CANADA', language: language });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register({ ...form, language: form.language.toUpperCase() });
      if (form.language !== language) setLanguage(form.language as Language);
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
        <h1 className="font-serif text-4xl font-light text-center mb-1">{t('auth.register')}</h1>
        <p className="text-center text-muted text-sm mb-10">{t('auth.registerSubtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">{t('auth.firstName')}</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">{t('auth.lastName')}</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} required className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('auth.email')}</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('auth.password')}</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('auth.address')}</label>
            <input name="address" value={form.address} onChange={handleChange} required className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">{t('auth.city')}</label>
              <input name="city" value={form.city} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">{t('auth.postalCode')}</label>
              <input name="postalCode" value={form.postalCode} onChange={handleChange} required className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('checkout.country')}</label>
            <select name="country" value={form.country} onChange={handleChange} required className={inputClass}>
              <option value="CANADA">Canada</option>
              <option value="UNITED_STATES">United States</option>
              <option value="MEXICO">Mexico</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2">{t('auth.language')}</label>
            <select name="language" value={form.language} onChange={handleChange} required className={inputClass}>
              {LANGUAGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 flex-shrink-0 accent-dark"
            />
            <span className="text-xs text-muted leading-relaxed">
              {t('auth.agreeTerms.pre')}
              <Link to="/terms" target="_blank" className="text-dark underline hover:text-gold transition-colors">
                {t('auth.agreeTerms.terms')}
              </Link>
              {t('auth.agreeTerms.mid')}
              <Link to="/privacy" target="_blank" className="text-dark underline hover:text-gold transition-colors">
                {t('auth.agreeTerms.privacy')}
              </Link>
            </span>
          </label>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || !agreed}
            className="w-full bg-dark text-white text-xs uppercase tracking-widest py-4 hover:bg-gold transition-colors disabled:opacity-50 cursor-pointer mt-2"
          >
            {loading ? '...' : t('auth.createAccount')}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-8">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-dark underline hover:text-gold transition-colors">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </div>
  );
}
