import { useTranslation } from 'react-i18next';

export default function Shipping() {
  const { t } = useTranslation();
  const p = (key: string) => t(`shipping.${key}`);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl font-light mb-10">{p('title')}</h1>

      <div className="space-y-10 text-sm leading-relaxed text-[#444]">
        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-4">{p('s1.title')}</h2>
          <p className="mb-4">{p('s1.body')}</p>
          <div className="border border-border divide-y divide-border">
            <div className="grid grid-cols-3 px-4 py-3 text-xs uppercase tracking-widest text-muted">
              <span>{p('s1.tableDestination')}</span>
              <span>{p('s1.tableMethod')}</span>
              <span>{p('s1.tableTime')}</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3">
              <span>{p('s1.mxDest')}</span>
              <span>{p('s1.mxMethod')}</span>
              <span>{p('s1.mxTime')}</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3">
              <span>{p('s1.usDest')}</span>
              <span>{p('s1.usMethod')}</span>
              <span>{p('s1.usTime')}</span>
            </div>
            <div className="grid grid-cols-3 px-4 py-3">
              <span>{p('s1.caDest')}</span>
              <span>{p('s1.caMethod')}</span>
              <span>{p('s1.caTime')}</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s2.title')}</h2>
          <p>{p('s2.body')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s3.title')}</h2>
          <p>{p('s3.body')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s4.title')}</h2>
          <p>{p('s4.body')}</p>
        </section>
      </div>
    </div>
  );
}
