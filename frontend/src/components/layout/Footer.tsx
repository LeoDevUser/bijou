import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');

  return (
    <footer className="bg-dark text-white mt-auto">
      {/* Newsletter */}
      <div className="border-b border-[#333]">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-serif text-2xl italic font-light">{t('footer.newsletter.title')}</p>
            <p className="text-muted text-sm mt-1 tracking-wide">{t('footer.newsletter.subtitle')}</p>
          </div>
          <form className="flex w-full md:w-auto" onSubmit={e => e.preventDefault()}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('footer.newsletter.placeholder')}
              className="bg-transparent border border-[#555] text-white placeholder-[#666] px-4 py-2.5 text-sm flex-1 md:w-72 outline-none focus:border-gold transition-colors"
            />
            <button
              type="submit"
              className="bg-white text-dark px-6 py-2.5 text-xs uppercase tracking-widest hover:bg-gold hover:text-white transition-colors cursor-pointer"
            >
              {t('footer.newsletter.subscribe')}
            </button>
          </form>
        </div>
      </div>

      {/* Links */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-5">{t('footer.help')}</p>
          <ul className="space-y-3">
            <li><a href="#" className="text-sm text-[#ccc] hover:text-white transition-colors">{t('footer.faq')}</a></li>
            <li><a href="#" className="text-sm text-[#ccc] hover:text-white transition-colors">{t('footer.shipping')}</a></li>
            <li><a href="#" className="text-sm text-[#ccc] hover:text-white transition-colors">{t('footer.returns')}</a></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted mb-5">{t('footer.about')}</p>
          <ul className="space-y-3">
            <li><a href="#" className="text-sm text-[#ccc] hover:text-white transition-colors">{t('footer.sustainability')}</a></li>
            <li><a href="#" className="text-sm text-[#ccc] hover:text-white transition-colors">{t('footer.careers')}</a></li>
          </ul>
        </div>
        <div className="col-span-2">
          <p className="font-serif text-3xl tracking-[0.22em] mb-4">BIJOU MONDE</p>
          <p className="text-muted text-sm mb-4">
            © {new Date().getFullYear()} Bijou Monde. {t('footer.rights')}
          </p>
          <div className="flex gap-5">
            <a href="#" className="text-muted hover:text-white text-sm transition-colors">{t('footer.legal.privacy')}</a>
            <a href="#" className="text-muted hover:text-white text-sm transition-colors">{t('footer.legal.terms')}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
