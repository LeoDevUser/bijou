import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { pickLocale } from '../../types';
import type { AnnouncementView } from '../../types';

function announcementHref(msg: AnnouncementView): string | null {
  if (msg.ctaCollectionId != null) return `/collections/${msg.ctaCollectionId}`;
  if (msg.ctaCategory || msg.ctaLabelId != null) {
    const params = new URLSearchParams();
    if (msg.ctaCategory) params.set('category', msg.ctaCategory);
    if (msg.ctaLabelId != null) params.set('label', String(msg.ctaLabelId));
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

  const msg = messages[index % messages.length];
  const text = pickLocale(msg.textEn, msg.textFr, msg.textEs, i18n.language);
  const href = announcementHref(msg);

  return (
    <div className="text-xs tracking-widest uppercase text-center py-2 px-4 select-none" style={{ backgroundColor: 'var(--bijou-announcement-bg)', color: 'var(--bijou-announcement-text)' }}>
      <span style={{ transition: 'opacity 0.4s', opacity: visible ? 1 : 0 }}>
        {href
          ? <Link to={href} className="hover:underline">{text}</Link>
          : text
        }
      </span>
    </div>
  );
}
