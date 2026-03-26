import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const MESSAGES = [
  'announcement.free_shipping',
  'announcement.new_collection',
  'announcement.returns',
] as const;

export default function AnnouncementBar() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[#1C1C1C] text-white text-xs tracking-widest uppercase text-center py-2 px-4 select-none">
      <span style={{ transition: 'opacity 0.4s', opacity: visible ? 1 : 0 }}>
        {t(MESSAGES[index])}
      </span>
    </div>
  );
}
