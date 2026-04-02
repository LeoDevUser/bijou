import { useTranslation } from 'react-i18next';

export default function About() {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl font-light mb-10">{t('about.title')}</h1>

      <div className="space-y-10 text-sm leading-relaxed text-[#444]">
        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{t('about.s1.title')}</h2>
          <p>{t('about.s1.body')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{t('about.s2.title')}</h2>
          <p>{t('about.s2.body')}</p>
        </section>
      </div>
    </div>
  );
}
