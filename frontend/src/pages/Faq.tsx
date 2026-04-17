import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function FaqItem({ question, answer, linkHref, linkLabel }: {
  question: string;
  answer: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border">
      <button
        className="w-full flex justify-between items-center py-5 text-left text-sm hover:text-dark transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span>{question}</span>
        <span className="text-muted ml-4 flex-shrink-0">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="pb-5">
          <p className="text-sm text-[#555] leading-relaxed whitespace-pre-line">{answer}</p>
          {linkHref && linkLabel && (
            <a
              href={linkHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-xs uppercase tracking-widest border-b border-current pb-0.5 hover:opacity-60 transition-opacity"
            >
              {linkLabel}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function Faq() {
  const { t, i18n } = useTranslation();

  const lang = i18n.language.startsWith('fr') ? 'fr' : i18n.language.startsWith('es') ? 'es' : 'en';
  const sizingChart = `/sizing_chart_${lang}.jpg`;

  const questions: { q: string; a: string; linkHref?: string; linkLabel?: string }[] = [
    { q: t('faq.q1.q'), a: t('faq.q1.a') },
    { q: t('faq.q2.q'), a: t('faq.q2.a') },
    { q: t('faq.q3.q'), a: t('faq.q3.a'), linkHref: sizingChart, linkLabel: t('faq.q3.chartLink') },
    { q: t('faq.q4.q'), a: t('faq.q4.a') },
    { q: t('faq.q5.q'), a: t('faq.q5.a') },
    { q: t('faq.q6.q'), a: t('faq.q6.a') },
    { q: t('faq.q7.q'), a: t('faq.q7.a'), linkHref: `/care_${lang}.jpg`, linkLabel: t('faq.q7.careLink') },
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl font-light mb-10">{t('faq.title')}</h1>
      <div>
        {questions.map((item, i) => (
          <FaqItem key={i} question={item.q} answer={item.a} linkHref={item.linkHref} linkLabel={item.linkLabel} />
        ))}
      </div>
    </div>
  );
}
