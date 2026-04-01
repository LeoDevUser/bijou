import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useLanguage, type Language } from '../context/LanguageContext';
import { api } from '../api/client';

const ADMIN_URL = import.meta.env.VITE_ADMIN_PAGE ?? '';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
];

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  language: string;
}

const inputClass = 'w-full border border-border bg-cream px-4 py-3 text-sm outline-none focus:border-dark transition-colors';
const btnClass = 'bg-dark text-white text-xs uppercase tracking-widest px-6 py-3 hover:bg-gold transition-colors disabled:opacity-50';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border p-6">
      <h2 className="font-serif text-xl font-light mb-5">{title}</h2>
      {children}
    </div>
  );
}

function StatusMsg({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  if (!msg) return null;
  return (
    <p className={`text-sm mt-3 ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>
  );
}

export default function Account() {
  const { t } = useTranslation();
  const { isAdmin, logout } = useAuth();
  const { setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);

  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [emailForm, setEmailForm] = useState({ password: '', newEmail: '' });
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const [address, setAddress] = useState('');
  const [addressMsg, setAddressMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);

  const [lang, setLang] = useState<Language>('en');
  const [langMsg, setLangMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [langLoading, setLangLoading] = useState(false);

  useEffect(() => {
    api.account.getProfile().then(p => {
      setProfile(p);
      setAddress(p.address);
      setLang(p.language.toLowerCase() as Language);
    });
  }, []);

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: t('account.password.mismatch') });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      await api.account.changePassword(pwForm.oldPassword, pwForm.newPassword);
      logout();
      navigate('/login');
    } catch {
      setPwMsg({ type: 'error', text: t('account.password.error') });
    } finally {
      setPwLoading(false);
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setEmailMsg(null);
    try {
      await api.account.changeEmail(emailForm.password, emailForm.newEmail);
      logout();
      navigate('/login');
    } catch {
      setEmailMsg({ type: 'error', text: t('account.email.error') });
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleAddress(e: React.FormEvent) {
    e.preventDefault();
    setAddressLoading(true);
    setAddressMsg(null);
    try {
      await api.account.changeAddress(address);
      setAddressMsg({ type: 'success', text: t('account.address.success') });
      setProfile(p => p ? { ...p, address } : p);
    } catch {
      setAddressMsg({ type: 'error', text: t('account.address.error') });
    } finally {
      setAddressLoading(false);
    }
  }

  async function handleLanguage(e: React.FormEvent) {
    e.preventDefault();
    setLangLoading(true);
    setLangMsg(null);
    try {
      await api.account.changeLanguage(lang.toUpperCase());
      setLanguage(lang);
      setLangMsg({ type: 'success', text: t('account.language.success') });
    } catch {
      setLangMsg({ type: 'error', text: t('account.language.error') });
    } finally {
      setLangLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-2">
        <h1 className="font-serif text-4xl font-light">{t('account.title')}</h1>
        {isAdmin && (
          <Link
            to={`/${ADMIN_URL}`}
            className="text-xs uppercase tracking-widest border border-border px-4 py-2 hover:border-dark transition-colors"
          >
            {t('account.admindashboard')}
          </Link>
        )}
      </div>
      {profile && (
        <p className="text-muted text-sm mb-10">{profile.firstName} {profile.lastName} · {profile.email}</p>
      )}

      <div className="space-y-6">
        <Section title={t('account.address.title')}>
          <form onSubmit={handleAddress} autoComplete="off" className="space-y-4">
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              required
              className={inputClass}
              placeholder={t('account.address.placeholder')}
            />
            <div className="flex justify-end">
              <button type="submit" disabled={addressLoading} className={btnClass}>
                {addressLoading ? '...' : t('account.address.save')}
              </button>
            </div>
            <StatusMsg msg={addressMsg} />
          </form>
        </Section>

        <Section title={t('account.language.title')}>
          <form onSubmit={handleLanguage} className="space-y-4">
            <select value={lang} onChange={e => setLang(e.target.value as Language)} className={inputClass}>
              {LANGUAGE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="flex justify-end">
              <button type="submit" disabled={langLoading} className={btnClass}>
                {langLoading ? '...' : t('account.language.save')}
              </button>
            </div>
            <StatusMsg msg={langMsg} />
          </form>
        </Section>

        <Section title={t('account.email.title')}>
          <form onSubmit={handleEmail} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">{t('account.email.newEmail')}</label>
              <input
                type="email"
                value={emailForm.newEmail}
                onChange={e => setEmailForm(f => ({ ...f, newEmail: e.target.value }))}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">{t('account.email.currentPassword')}</label>
              <input
                type="password"
                value={emailForm.password}
                onChange={e => setEmailForm(f => ({ ...f, password: e.target.value }))}
                required
                className={inputClass}
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={emailLoading} className={btnClass}>
                {emailLoading ? '...' : t('account.email.save')}
              </button>
            </div>
            <StatusMsg msg={emailMsg} />
          </form>
        </Section>

        <Section title={t('account.password.title')}>
          <form onSubmit={handlePassword} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">{t('account.password.current')}</label>
              <input
                type="password"
                value={pwForm.oldPassword}
                onChange={e => setPwForm(f => ({ ...f, oldPassword: e.target.value }))}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">{t('account.password.new')}</label>
              <input
                type="password"
                value={pwForm.newPassword}
                onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-2">{t('account.password.confirm')}</label>
              <input
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                required
                className={inputClass}
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={pwLoading} className={btnClass}>
                {pwLoading ? '...' : t('account.password.save')}
              </button>
            </div>
            <StatusMsg msg={pwMsg} />
          </form>
        </Section>
      </div>
    </div>
  );
}
