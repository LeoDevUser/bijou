import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import type { CollectionView } from '../types';
import { pickLocale } from '../types';
import AutoplayVideo from '../components/ui/AutoplayVideo';
import { optimizedImageUrl } from '../utils/cloudinary';

function CollectionMedia({ c, className }: { c: CollectionView; className: string }) {
  if (!c.imageUrl) return null;
  if (c.resourceType === 'video') {
    return <AutoplayVideo src={c.imageUrl} className={className} />;
  }
  return <img src={optimizedImageUrl(c.imageUrl)} alt={pickLocale(c.headerEn, c.headerFr, c.headerEs, 'en') || ''} className={className} />;
}

export function CollectionCard({ c }: { c: CollectionView }) {
  const { t, i18n } = useTranslation();
  const header = pickLocale(c.headerEn, c.headerFr, c.headerEs, i18n.language);
  const subheader = pickLocale(c.subheaderEn, c.subheaderFr, c.subheaderEs, i18n.language);
  const firstLabel = c.labels[0];
  const labelName = firstLabel ? pickLocale(firstLabel.nameEn, firstLabel.nameFr, firstLabel.nameEs, i18n.language) : '';
  return (
    <Link
      to={`/collections/${c.id}`}
      className="group block relative overflow-hidden aspect-[4/3] bg-[#E8E4DC]"
    >
      <CollectionMedia c={c} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />

      {/* Text */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center p-8"
        style={{ color: c.cardTextColor ?? '#FFFFFF' }}
      >
        {subheader && (
          <p className="text-xs uppercase tracking-widest mb-3 opacity-90">{subheader}</p>
        )}
        <h2 className="font-serif text-3xl md:text-4xl italic font-light leading-tight mb-4">{header || labelName}</h2>
        <span className="text-xs uppercase tracking-widest border-b pb-0.5 opacity-90"
          style={{ borderColor: c.cardTextColor ?? '#FFFFFF' }}>
          {t('collections.shopNow')}
        </span>
      </div>
    </Link>
  );
}

export default function Collections() {
  const { t } = useTranslation();
  const [collections, setCollections] = useState<CollectionView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.collections.list()
      .then(setCollections)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="font-serif text-4xl font-light mb-10">{t('nav.collections')}</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-[#F0EDE8] aspect-[4/3] mb-3" />
            </div>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <p className="text-muted text-center py-24">{t('collections.empty')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map(c => <CollectionCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
}
