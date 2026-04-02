import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function FaqItem({ question, answer }: { question: string; answer: string }) {
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
      {open && <p className="pb-5 text-sm text-[#555] leading-relaxed">{answer}</p>}
    </div>
  );
}

export default function Faq() {
  const { t } = useTranslation();

  const questions: { q: string; a: string }[] = [
    { q: t('faq.q1.q'), a: t('faq.q1.a') },
    { q: t('faq.q2.q'), a: t('faq.q2.a') },
    { q: t('faq.q3.q'), a: t('faq.q3.a') },
    { q: t('faq.q4.q'), a: t('faq.q4.a') },
    { q: t('faq.q5.q'), a: t('faq.q5.a') },
    { q: t('faq.q6.q'), a: t('faq.q6.a') },
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl font-light mb-10">{t('faq.title')}</h1>
      <div>
        {questions.map((item, i) => (
          <FaqItem key={i} question={item.q} answer={item.a} />
        ))}
      </div>
    </div>
  );
}
