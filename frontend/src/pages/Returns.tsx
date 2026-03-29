import { useTranslation } from 'react-i18next';

export default function Returns() {
  const { t } = useTranslation();
  const p = (key: string) => t(`returns.${key}`);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl font-light mb-10">{p('title')}</h1>

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
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s3.title')}</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>{p('s3.i1')}</li>
            <li>{p('s3.i2')}</li>
            <li>{p('s3.i3')}</li>
            <li>{p('s3.i4')}</li>
          </ol>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s4.title')}</h2>
          <p>{p('s4.body')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s5.title')}</h2>
          <p>{p('s5.body')}</p>
        </section>
      </div>
    </div>
  );
}
