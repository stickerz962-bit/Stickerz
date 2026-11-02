import { useEffect, useState } from 'react';
import './styles.css';

const scenes = [
  { caption: 'شدي الفيشة', title: 'فصلّي شوية من دوشة اليوم' },
  { caption: 'فكّي الضغط', title: 'سيبي اللي مش مستاهل' },
  { caption: 'سكتي الأصوات الي في دماغك', title: 'مش كل فكرة محتاجة رد' },
  { caption: 'اشحني طاقتك', title: 'خدي وقتك وارجعي لنفسك' },
];

function Drawing({ scene, colored }: { scene: number; colored: boolean }) {
  const ink = '#514b59';
  const accent = colored ? ['#e98eaa', '#b7a4d9', '#e7bd68', '#9fc8ae'][scene] : 'none';
  const secondary = colored ? ['#f2c7d5', '#d9c8eb', '#f5dfaa', '#c9e2d2'][scene] : 'none';
  return <svg viewBox="0 0 220 190" role="presentation" aria-hidden="true">
    {scene === 0 && <>
      <path d="M110 160V111 M110 111L83 86 M110 111L137 86" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round"/>
      <path d="M65 55h35v48H65z M120 55h35v48h-35z" fill={secondary} stroke={ink} strokeWidth="3" strokeLinejoin="round"/>
      <path d="M77 55V38h11v17 M132 55V38h11v17 M73 78h19 M128 78h19" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round"/>
      <path d="M91 158q19-17 38 0 M75 171q35-18 70 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round"/>
      {colored && <path d="M110 111L83 86L65 55h35v48 M110 111l27-25 18-31h-35z" fill={accent} opacity=".9"/>}
    </>}
    {scene === 1 && <>
      <path d="M45 112c-19-26 5-53 30-42 3-34 45-41 57-11 26-15 56 6 44 34 25 22 6 54-22 49H72c-16 0-25-12-27-30z" fill={secondary} stroke={ink} strokeWidth="3"/>
      <path d="M76 98q12-12 24 0 M122 98q12-12 24 0 M96 122q14 13 28 0" fill="none" stroke={ink} strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M109 37v-15 M53 58L42 47 M165 58l11-11" stroke={ink} strokeWidth="3" strokeLinecap="round"/>
      {colored && <path d="M76 98q12-12 24 0 M122 98q12-12 24 0" stroke={accent} strokeWidth="5" fill="none" strokeLinecap="round"/>}
    </>}
    {scene === 2 && <>
      <path d="M42 62q-20-20 0-36t40 0q20 20 0 40 M140 45q20-20 40 0t0 40q-20 20-40 0" fill={secondary} stroke={ink} strokeWidth="3"/>
      <path d="M70 104q-12-20 7-30 18-9 33 7 15-16 33-7 19 10 7 30l-40 48z" fill={accent} stroke={ink} strokeWidth="3" strokeLinejoin="round"/>
      <path d="M88 111q10 9 22 0 12 9 22 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round"/>
      <path d="M109 16v-9 M28 100H16 M194 100h-12 M54 153l-8 8 M164 153l8 8" stroke={ink} strokeWidth="3" strokeLinecap="round"/>
    </>}
    {scene === 3 && <>
      <rect x="80" y="38" width="60" height="112" rx="13" fill={secondary} stroke={ink} strokeWidth="3"/>
      <rect x="91" y="50" width="38" height="72" rx="7" fill={colored ? '#fff9e9' : 'none'} stroke={ink} strokeWidth="2"/>
      <path d="M99 34v-9h22v9 M96 139h28" stroke={ink} strokeWidth="3" strokeLinecap="round"/>
      <path d="M110 105V76 M98 89l12-13 12 13" fill="none" stroke={accent === 'none' ? ink : accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M56 63q-14-13-25 0 M164 63q14-13 25 0 M54 132q-14 13-25 0 M166 132q14 13 25 0" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round"/>
    </>}
  </svg>;
}

export default function HeroBookAnimation() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive(current => (current + 1) % scenes.length), 4200);
    return () => window.clearInterval(timer);
  }, []);

  const scene = scenes[active];
  return <div className="hero-coloring-scene" role="img" aria-label={`كتاب تلوين مفتوح، ${scene.caption}، رسمة أبيض وأسود وأخرى ملونة`}>
    <div className="hero-coloring-glow" />
    <span className="coloring-spark one">✦</span><span className="coloring-spark two">✧</span>
    <div className="coloring-book" aria-live="off">
      <div className="coloring-spread" key={active}>
        <div className="coloring-page left">
          <Drawing scene={active} colored={false} />
          <span className="page-label">لوّنيني</span>
        </div>
        <div className="coloring-page right">
          <Drawing scene={active} colored={true} />
          <span className="page-label">على مزاجك</span>
        </div>
      </div>
      <span className="coloring-spine" />
    </div>
    <div className="coloring-caption" aria-live="polite">
      <strong>{scene.caption}</strong>
      <span>{scene.title}</span>
    </div>
    <div className="coloring-pagination" aria-label={`المشهد ${active + 1} من 4`}>
      {scenes.map((item, index) => <span key={item.caption} className={index === active ? 'active' : ''} />)}
    </div>
  </div>;
}
