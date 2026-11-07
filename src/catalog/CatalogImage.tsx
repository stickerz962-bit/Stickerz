import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase/client';

type Props = {
  source?: string;
  alt: string;
  fit?: 'contain' | 'cover';
  className?: string;
  style?: CSSProperties;
};

const assetCache = new Map<string, Promise<string | null>>();

function loadAsset(source: string): Promise<string | null> {
  const cached = assetCache.get(source);
  if (cached) return cached;
  const match = /^asset:(artwork|cover):([A-Za-z0-9_-]+)$/.exec(source);
  if (!match || !firestore) return Promise.resolve(null);
  const [, , assetId] = match;
  const request = getDoc(doc(firestore, 'catalogAssets', assetId)).then(snapshot => {
    const value = snapshot.exists() ? snapshot.data().dataUrl : null;
    return typeof value === 'string' && value.startsWith('data:image/') ? value : null;
  }).catch(() => null);
  assetCache.set(source, request);
  return request;
}

/**
 * Legacy data URLs and ordinary image URLs continue to render unchanged.
 * New Firestore asset references are fetched only when their preview approaches
 * the viewport, so catalog metadata queries stay small.
 */
export default function CatalogImage({ source = '', alt, fit = 'contain', className, style }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolvedSource, setResolvedSource] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResolvedSource('');
    setFailed(false);
    if (!source) return;
    if (!source.startsWith('asset:')) {
      setResolvedSource(source);
      return;
    }

    const fetchAsset = () => {
      void loadAsset(source).then(value => {
        if (cancelled) return;
        if (value) setResolvedSource(value);
        else setFailed(true);
      });
    };

    const element = containerRef.current;
    if (typeof IntersectionObserver === 'undefined' || !element) {
      fetchAsset();
      return () => { cancelled = true; };
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        fetchAsset();
      }
    }, { rootMargin: '180px' });
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [source]);

  return <div ref={containerRef} className={className} style={{ display: 'block', width: '100%', height: '100%', ...style }}>
    {resolvedSource
      ? <img src={resolvedSource} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', display: 'block', objectFit: fit }} />
      : failed
        ? <span role="img" aria-label={alt} style={{ display: 'grid', width: '100%', height: '100%', placeItems: 'center', color: '#999', fontSize: 11 }}>المعاينة غير متاحة</span>
        : null}
  </div>;
}
