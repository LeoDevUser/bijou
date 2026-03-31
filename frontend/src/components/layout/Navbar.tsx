import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useCurrency, CURRENCIES } from '../../context/CurrencyContext';
import AnnouncementBar from './AnnouncementBar';

const NAV_LINKS = [
  { key: 'nav.allJewelry', to: '/shop' },
  { key: 'nav.newIn', to: '/shop?label=new' },
  { key: 'nav.collections', to: '/collections' },
] as const;

const LANGUAGES = ['es', 'en', 'fr'] as const;

const LANGUAGE_FLAGS: Record<string, string> = { es: '🇲🇽', en: '🇺🇸🇨🇦', fr: '🇨🇦' };

const CURRENCY_FLAGS: Record<string, string> = { MXN: '🇲🇽', CAD: '🇨🇦', USD: '🇺🇸' };

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { count } = useCart();
  const { isAuthenticated, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function close() { setMenuOpen(false); }

  return (
    <header className="sticky top-0 z-50 bg-cream">
      <AnnouncementBar />
      <div className="border-b border-border">

        {/* ── Main row ── */}
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center relative">

          {/* Left: hamburger (mobile) / nav links (desktop) */}
          <div className="flex items-center">
            {/* Hamburger */}
            <button
              className="md:hidden text-dark hover:text-gold transition-colors cursor-pointer"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
            >
              {menuOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="3" y1="7" x2="21" y2="7" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="17" x2="21" y2="17" />
                </svg>
              )}
            </button>

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map(link => (
                <Link key={link.key} to={link.to} className="text-xs uppercase tracking-widest text-dark hover:text-gold transition-colors">
                  {t(link.key)}
                </Link>
              ))}
            </nav>
          </div>

          {/* Center: Logo */}
          <Link to="/" onClick={close} className="absolute left-1/2 -translate-x-1/2 font-serif text-2xl tracking-[0.22em] text-dark whitespace-nowrap">
            BIJOU MONDE
          </Link>

          {/* Right: desktop account links + cart */}
          <div className="flex items-center gap-5 ml-auto">
            {isAuthenticated ? (
              <>
                <Link to="/account" className="hidden md:block text-xs uppercase tracking-wider text-dark hover:text-gold transition-colors">{t('nav.account')}</Link>
                <Link to="/orders" className="hidden md:block text-xs uppercase tracking-wider text-dark hover:text-gold transition-colors">{t('nav.orders')}</Link>
                <button onClick={() => { logout(); navigate('/'); }} className="hidden md:block text-xs uppercase tracking-wider text-dark hover:text-gold transition-colors cursor-pointer">{t('nav.logout')}</button>
              </>
            ) : (
              <Link to="/login" className="hidden md:block text-xs uppercase tracking-wider text-dark hover:text-gold transition-colors">{t('nav.account')}</Link>
            )}

            <Link to="/cart" onClick={close} className="relative text-dark hover:text-gold transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              {count > 0 && (
                <span className="absolute -top-2 -right-2 bg-dark text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center leading-none">
                  {count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* ── Desktop row 2: language (left) + currency (right) ── */}
        <div className="hidden md:flex justify-between items-center border-t border-border py-1.5 max-w-7xl mx-auto px-6 w-full">
          <div className="flex items-center gap-1.5">
            {LANGUAGES.map((lang, idx) => (
              <span key={lang} className="flex items-center gap-1.5">
                <button onClick={() => i18n.changeLanguage(lang)} className={`flex items-center gap-1 text-[11px] uppercase tracking-wider transition-colors cursor-pointer ${i18n.language === lang ? 'text-dark font-medium' : 'text-muted'}`}>
                  <span>{LANGUAGE_FLAGS[lang]}</span>{lang}
                </button>
                {idx < LANGUAGES.length - 1 && <span className="text-muted text-xs">|</span>}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {CURRENCIES.map((c, idx) => (
              <span key={c} className="flex items-center gap-1.5">
                <button onClick={() => setCurrency(c)} className={`flex items-center gap-1 text-[11px] uppercase tracking-wider transition-colors cursor-pointer ${currency === c ? 'text-dark font-medium' : 'text-muted'}`}>
                  <span>{CURRENCY_FLAGS[c]}</span>{c}
                </button>
                {idx < CURRENCIES.length - 1 && <span className="text-muted text-xs">|</span>}
              </span>
            ))}
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-cream">
            <div className="px-6 py-2">

              {/* Nav links */}
              {NAV_LINKS.map(link => (
                <Link
                  key={link.key}
                  to={link.to}
                  onClick={close}
                  className="flex items-center py-3.5 text-xs uppercase tracking-widest text-dark hover:text-gold transition-colors border-b border-border last:border-b-0"
                >
                  {t(link.key)}
                </Link>
              ))}

              {/* Account links */}
              <div className="border-b border-border">
                {isAuthenticated ? (
                  <>
                    <Link to="/account" onClick={close} className="flex items-center py-3.5 text-xs uppercase tracking-widest text-dark hover:text-gold transition-colors">{t('nav.account')}</Link>
                    <Link to="/orders" onClick={close} className="flex items-center py-3.5 text-xs uppercase tracking-widest text-dark hover:text-gold transition-colors">{t('nav.orders')}</Link>
                    <button onClick={() => { logout(); navigate('/'); close(); }} className="flex items-center w-full py-3.5 text-xs uppercase tracking-widest text-dark hover:text-gold transition-colors cursor-pointer">{t('nav.logout')}</button>
                  </>
                ) : (
                  <Link to="/login" onClick={close} className="flex items-center py-3.5 text-xs uppercase tracking-widest text-dark hover:text-gold transition-colors">{t('nav.account')}</Link>
                )}
              </div>

              {/* Language + Currency */}
              <div className="flex flex-col gap-3 py-4">
                <div className="flex items-center gap-3">
                  {LANGUAGES.map((lang, idx) => (
                    <span key={lang} className="flex items-center gap-3">
                      <button onClick={() => i18n.changeLanguage(lang)} className={`flex items-center gap-1 text-xs uppercase tracking-wider transition-colors cursor-pointer ${i18n.language === lang ? 'text-dark font-medium' : 'text-muted'}`}>
                        <span>{LANGUAGE_FLAGS[lang]}</span>{lang}
                      </button>
                      {idx < LANGUAGES.length - 1 && <span className="text-muted text-xs">|</span>}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  {CURRENCIES.map((c, idx) => (
                    <span key={c} className="flex items-center gap-3">
                      <button onClick={() => setCurrency(c)} className={`flex items-center gap-1 text-xs uppercase tracking-wider transition-colors cursor-pointer ${currency === c ? 'text-dark font-medium' : 'text-muted'}`}>
                        <span>{CURRENCY_FLAGS[c]}</span>{c}
                      </button>
                      {idx < CURRENCIES.length - 1 && <span className="text-muted text-xs">|</span>}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </header>
  );
}
