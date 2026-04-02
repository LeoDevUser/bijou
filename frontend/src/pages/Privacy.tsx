import { useTranslation } from 'react-i18next';

export default function Privacy() {
  const { t } = useTranslation();
  const p = (key: string) => t(`privacy.${key}`);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl font-light mb-2">{p('title')}</h1>
      <p className="text-xs text-muted uppercase tracking-widest mb-12">{p('updated')}</p>

      <div className="space-y-10 text-sm leading-relaxed text-[#444]">
        {(['s1','s2','s3','s4','s5','s6','s7','s8','s9'] as const).map(s => (
          <section key={s}>
            <h2 className="font-serif text-xl font-light text-dark mb-3">{p(`${s}.title`)}</h2>
            <p>{p(`${s}.body`)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
