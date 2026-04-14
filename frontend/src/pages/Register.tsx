import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useLanguage, type Language } from '../context/LanguageContext';
import { getStateOptions, getPostalCodePattern, getPostalCodePlaceholder, getPhonePlaceholder } from '../data/addressOptions';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
];

const COUNTRIES = [
  { value: 'CANADA', label: 'Canada' },
  { value: 'UNITED_STATES', label: 'United States' },
  { value: 'MEXICO', label: 'Mexico' },
];

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    country: 'CANADA',
    phoneNumber: '',
    addressLine1: '',
    addressLine2: '',
    colonial: '',
    city: '',
    state: '',
    postalCode: '',
    language: language,
  });
  const [agreed, setAgreed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(f => {
      const next = { ...f, [name]: value };
      // Reset state when country changes — the old value is invalid for the new list
      if (name === 'country') next.state = '';
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        country: form.country,
        phoneNumber: form.phoneNumber,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || undefined,
        colonial: form.colonial || undefined,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        language: form.language.toUpperCase(),
      });
      if (form.language !== language) setLanguage(form.language as Language);
      navigate('/');
    } catch (err) {
      const e = err as { code?: string };
      if (e.code === 'PASSWORD_INVALID') {
        setError(t('auth.passwordInvalid'));
      } else {
        setError(e.code ?? t('auth.error'));
      }
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full border border-border bg-cream px-4 py-3 text-sm outline-none focus:border-dark transition-colors';
  const labelClass = 'block text-xs uppercase tracking-widest mb-2';
  const stateOptions = getStateOptions(form.country);
  const stateLabel = form.country === 'CANADA' ? t('auth.province') : t('auth.state');

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-4xl font-light text-center mb-1">{t('auth.register')}</h1>
        <p className="text-center text-muted text-sm mb-10">{t('auth.registerSubtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('auth.firstName')}</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('auth.lastName')}</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} required className={inputClass} />
            </div>
          </div>

          {/* Credentials */}
          <div>
            <label className={labelClass}>{t('auth.email')}</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('auth.password')}</label>
            <div className="relative">
              <input name="password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange} required className={`${inputClass} pr-12`} />
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

          {/* Country — drives the rest of the address form */}
          <div>
            <label className={labelClass}>{t('checkout.country')}</label>
            <select name="country" value={form.country} onChange={handleChange} required className={`${inputClass} appearance-none cursor-pointer`}>
              {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className={labelClass}>{t('auth.phoneNumber')}</label>
            <input
              name="phoneNumber"
              type="tel"
              value={form.phoneNumber}
              onChange={handleChange}
              required
              placeholder={getPhonePlaceholder(form.country)}
              className={inputClass}
            />
          </div>

          {/* Address Line 1 */}
          <div>
            <label className={labelClass}>{t('auth.addressLine1')}</label>
            <input name="addressLine1" value={form.addressLine1} onChange={handleChange} required className={inputClass} />
          </div>

          {/* Address Line 2 */}
          <div>
            <label className={labelClass}>{t('auth.addressLine2')}</label>
            <input name="addressLine2" value={form.addressLine2} onChange={handleChange} className={inputClass} />
          </div>

          {/* Colonia — Mexico only */}
          {form.country === 'MEXICO' && (
            <div>
              <label className={labelClass}>{t('auth.colonial')}</label>
              <input name="colonial" value={form.colonial} onChange={handleChange} required className={inputClass} />
            </div>
          )}

          {/* City + State/Province */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('auth.city')}</label>
              <input name="city" value={form.city} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{stateLabel}</label>
              <select name="state" value={form.state} onChange={handleChange} required className={`${inputClass} appearance-none cursor-pointer`}>
                <option value="" disabled>— {stateLabel} —</option>
                {stateOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Postal Code */}
          <div>
            <label className={labelClass}>{t('auth.postalCode')}</label>
            <input
              name="postalCode"
              value={form.postalCode}
              onChange={handleChange}
              required
              pattern={getPostalCodePattern(form.country)}
              placeholder={getPostalCodePlaceholder(form.country)}
              className={inputClass}
            />
          </div>

          {/* Language */}
          <div>
            <label className={labelClass}>{t('auth.language')}</label>
            <select name="language" value={form.language} onChange={handleChange} required className={`${inputClass} appearance-none cursor-pointer`}>
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
