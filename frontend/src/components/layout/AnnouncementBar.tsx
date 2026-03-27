import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client';
import { pickLocale } from '../../types';
import type { AnnouncementView } from '../../types';

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

  return (
    <div className="bg-[#1C1C1C] text-white text-xs tracking-widest uppercase text-center py-2 px-4 select-none">
      <span style={{ transition: 'opacity 0.4s', opacity: visible ? 1 : 0 }}>
        {text}
      </span>
    </div>
  );
}
