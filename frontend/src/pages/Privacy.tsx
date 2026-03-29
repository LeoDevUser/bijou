import { useTranslation } from 'react-i18next';

export default function Privacy() {
  const { t } = useTranslation();
  const p = (key: string) => t(`privacy.${key}`);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl font-light mb-2">{p('title')}</h1>
      <p className="text-xs text-muted uppercase tracking-widest mb-12">{p('updated')}</p>

      <div className="space-y-10 text-sm leading-relaxed text-[#444]">
        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s1.title')}</h2>
          <p>{p('s1.body')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s2.title')}</h2>
          <p className="mb-3">{p('s2.intro')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{p('s2.i1')}</li>
            <li>{p('s2.i2')}</li>
            <li>{p('s2.i3')}</li>
            <li>{p('s2.i4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s3.title')}</h2>
          <p className="mb-3">{p('s3.intro')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{p('s3.i1')}</li>
            <li>{p('s3.i2')}</li>
            <li>{p('s3.i3')}</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s4.title')}</h2>
          <p>{p('s4.body')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s5.title')}</h2>
          <p>{p('s5.body')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s6.title')}</h2>
          <p className="mb-3">{p('s6.intro')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{p('s6.i1')}</li>
            <li>{p('s6.i2')}</li>
            <li>{p('s6.i3')}</li>
            <li>{p('s6.i4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s7.title')}</h2>
          <p>{p('s7.body')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s8.title')}</h2>
          <p>{p('s8.body')}</p>
        </section>
      </div>
    </div>
  );
}
