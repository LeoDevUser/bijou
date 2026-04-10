import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-dark text-white mt-auto">
      {/* Links */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-5">{t('footer.help')}</p>
          <ul className="space-y-3">
            <li><Link to="/faq" className="text-sm text-[#ccc] hover:text-white transition-colors">{t('footer.faq')}</Link></li>
            <li><Link to="/shipping" className="text-sm text-[#ccc] hover:text-white transition-colors">{t('footer.shipping')}</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-5">{t('footer.company')}</p>
          <ul className="space-y-3">
            <li><Link to="/about" className="text-sm text-[#ccc] hover:text-white transition-colors">{t('footer.aboutUs')}</Link></li>
          </ul>
        </div>
        <div className="col-span-2">
          <p className="font-serif text-3xl tracking-[0.22em] mb-4">BIJOU MONDE</p>
          <p className="text-muted text-sm mb-4">
            © {new Date().getFullYear()} Bijou Monde. {t('footer.rights')}
          </p>
          <div className="flex gap-5">
            <Link to="/privacy" className="text-muted hover:text-white text-sm transition-colors">{t('footer.legal.privacy')}</Link>
            <Link to="/terms" className="text-muted hover:text-white text-sm transition-colors">{t('footer.legal.terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
