import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { pickLocale } from '../../types';
import type { AnnouncementView } from '../../types';

function announcementHref(msg: AnnouncementView): string | null {
  if (msg.ctaCollectionId != null) return `/collections/${msg.ctaCollectionId}`;
  if (msg.ctaCategoryIds.length > 0 || msg.ctaLabelIds.length > 0) {
    const params = new URLSearchParams();
    msg.ctaCategoryIds.forEach(id => params.append('category', String(id)));
    msg.ctaLabelIds.forEach(id => params.append('label', String(id)));
    return `/shop?${params.toString()}`;
  }
  return null;
}

export default function AnnouncementBar() {
  const { i18n } = useTranslation();
  const [messages, setMessages] = useState<AnnouncementView[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    api.announcements.list().then(setMessages).catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % messages.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, [messages.length]);

  if (messages.length === 0) return null;

  const current = index % messages.length;

  // All messages are stacked in the same grid cell so the bar's height is that of
  // the tallest one. Without this the bar resizes as messages rotate and pushes
  // the page around, which is especially bad on mobile where long text wraps.
  return (
    <div className="text-xs tracking-widest uppercase text-center py-2 px-4 select-none grid place-items-center" style={{ backgroundColor: 'var(--bijou-announcement-bg)', color: 'var(--bijou-announcement-text)' }}>
      {messages.map((m, i) => {
        const text = pickLocale(m.textEn, m.textFr, m.textEs, i18n.language);
        const href = announcementHref(m);
        const shown = i === current && visible;
        return (
          <span
            key={m.id}
            aria-hidden={i !== current}
            style={{
              gridArea: '1 / 1',
              transition: 'opacity 0.4s',
              opacity: shown ? 1 : 0,
              visibility: i === current ? 'visible' : 'hidden',
            }}
          >
            {href
              ? <Link to={href} className="hover:underline" tabIndex={i === current ? undefined : -1}>{text}</Link>
              : text
            }
          </span>
        );
      })}
    </div>
  );
}
