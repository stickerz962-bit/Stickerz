import './styles.css';

export default function HeroBookAnimation() {
  return <div className="hero-coloring-scene" role="img" aria-label="كتاب تلوين مفتوح ورسمة زهور تتحول تدريجيًا إلى ألوان مع حركة قلم">
    <div className="hero-coloring-glow" />
    <span className="coloring-spark one">✦</span><span className="coloring-spark two">✧</span>
    <div className="coloring-book">
      <div className="coloring-page left">
        <svg viewBox="0 0 180 250" aria-hidden="true">
          <path className="coloring-outline" d="M90 218 C88 175 92 130 91 76 M90 150 C57 135 45 110 50 88 M91 129 C120 113 133 91 130 67 M91 178 C117 165 130 150 134 130" />
          <path className="coloring-outline" d="M50 89 C29 78 29 51 48 43 C67 38 75 62 50 89 M50 89 C75 81 82 56 67 45 C52 36 38 58 50 89 M130 68 C111 57 112 33 132 27 C150 25 157 49 130 68 M130 68 C151 64 166 40 151 29 C135 19 119 43 130 68" />
          <path className="coloring-outline" d="M65 143 C42 150 29 135 35 119 C45 105 63 119 65 143 M65 143 C82 128 79 106 62 104 C45 104 43 128 65 143 M133 131 C151 111 171 121 168 140 C163 157 143 151 133 131 M133 131 C119 109 132 91 148 98 C164 106 154 126 133 131" />
          <path className="coloring-outline" d="M91 77 C77 61 83 43 98 43 C113 46 109 67 91 77 M91 77 C106 59 126 63 126 79 C124 96 102 91 91 77" />
          <path className="coloring-outline" d="M25 220 Q90 205 155 220 M35 230 Q90 218 145 230" />
        </svg>
      </div>
      <div className="coloring-page right">
        <svg viewBox="0 0 180 250" aria-hidden="true">
          <path className="coloring-fill" d="M89 80 C65 57 73 34 92 35 C111 35 111 61 89 80Z" />
          <path className="coloring-fill leaf" d="M51 89 C27 78 29 52 48 44 C67 39 75 63 51 89Z" />
          <path className="coloring-fill sun" d="M130 68 C111 57 112 33 132 27 C150 25 157 49 130 68Z" />
          <path className="coloring-outline" d="M90 218 C88 175 92 130 91 76 M90 150 C57 135 45 110 50 88 M91 129 C120 113 133 91 130 67 M91 178 C117 165 130 150 134 130 M50 89 C29 78 29 51 48 43 C67 38 75 62 50 89 M130 68 C111 57 112 33 132 27 C150 25 157 49 130 68 M25 220 Q90 205 155 220" />
        </svg>
      </div>
      <span className="coloring-spine" />
      <svg className="coloring-hand" viewBox="0 0 150 155" aria-hidden="true">
        <path className="pencil-body" d="M25 18 L38 11 L104 115 L91 123 Z" />
        <path className="pencil-tip" d="M91 123 L104 115 L109 137 Z" />
        <path className="hand-skin" d="M74 93 C64 83 52 73 45 62 C39 52 44 44 51 47 C59 51 67 62 73 66 L62 43 C57 31 68 25 75 37 L91 63 L83 31 C80 17 94 14 99 28 L110 65 L109 42 C109 29 123 29 125 43 L130 84 C132 108 119 126 99 134 L78 139 C68 141 58 133 54 124Z" />
      </svg>
    </div>
    <div className="coloring-caption">لحظة تلوين... على مزاجك ♡</div>
  </div>;
}
