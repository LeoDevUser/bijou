import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' , address: ''});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register(form);
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
          <div className="grid grid-cols-2 gap-4">
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
            <input name="address" type="address" value={form.address} onChange={handleChange} required className={inputClass} />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
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
