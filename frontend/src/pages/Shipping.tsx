import { useTranslation } from 'react-i18next';
import { formatSettingsAmount as amount, usePublicSettings } from '../hooks/usePublicSettings';

export default function Shipping() {
  const { t } = useTranslation();
  const p = (key: string, opts?: Record<string, unknown>) => t(`shipping.${key}`, opts);
  const settings = usePublicSettings();

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl font-light mb-10">{p('title')}</h1>

      <div className="space-y-10 text-sm leading-relaxed text-[#444]">
        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s1.title')}</h2>
          <p className="mb-3">{p('s1.intro')}</p>
          <ul className="list-disc list-inside space-y-1 mb-3">
            <li>{p('s1.i1')}</li>
            <li>{p('s1.i2')}</li>
          </ul>
          <p className="text-muted italic">{p('s1.note')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s2.title')}</h2>
          <p className="mb-3">{p('s2.body')}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{p('s2.i1')}</li>
            <li>{p('s2.i2')}</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s3.title')}</h2>
          <div className="space-y-4 mt-3">
            {(['mx'] as const).map(zone => (
              <div key={zone}>
                <h3 className="font-medium text-dark mb-1">{p(`s3.${zone}.title`)}</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>{p(`s3.${zone}.i1`)}</li>
                  <li>{p(`s3.${zone}.i2`)}</li>
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-muted italic">{p('s3.note')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s4.title')}</h2>
          <p className="mb-3">{p('s4.body')}</p>
          <ul className="list-disc list-inside space-y-1 mb-3">
            {settings && (
              <>
                <li>{p('s4.i1', { standard: amount(settings.standardShippingFee) })}</li>
                <li>{p('s4.i2', { extended: amount(settings.extendedShippingFee) })}</li>
                <li>{p('s4.i3', { threshold: amount(settings.freeShippingThreshold) })}</li>
              </>
            )}
            <li>{p('s4.i4')}</li>
          </ul>
          <p className="text-muted italic">{p('s4.note')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s6.title')}</h2>
          <p>{p('s6.body')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s7.title')}</h2>
          <p className="mb-3">{p('s7.intro')}</p>
          <ul className="list-disc list-inside space-y-1 mb-3">
            <li>{p('s7.i1')}</li>
            <li>{p('s7.i2')}</li>
            <li>{p('s7.i3')}</li>
          </ul>
          <p className="text-muted italic">{p('s7.note')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s8.title')}</h2>
          <p>{p('s8.body')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s9.title')}</h2>
          <p>{p('s9.body')}</p>
        </section>

        <section>
          <h2 className="font-serif text-xl font-light text-dark mb-3">{p('s10.title')}</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>{p('s10.i1')}</li>
            <li>{p('s10.i2')}</li>
            <li>{p('s10.i3')}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
