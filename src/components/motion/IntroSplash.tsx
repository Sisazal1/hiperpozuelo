// Pantalla de entrada de marca: solo la primera visita de cada sesión, nunca con
// prefers-reduced-motion. Se decide con un script en línea ANTES del primer pintado, así que
// quien vuelve no ve ni un fotograma de ella. No bloquea: pointer-events none y el contenido
// se pinta por debajo (no retrasa LCP).
const decide = `(function(){var d=document.documentElement;d.classList.add('js');try{var r=matchMedia('(prefers-reduced-motion: reduce)').matches;if(r||sessionStorage.getItem('hp-intro')==='1'||navigator.webdriver&&!location.search.includes('intro=1')){d.dataset.intro='skip'}else{sessionStorage.setItem('hp-intro','1');d.dataset.intro='play';setTimeout(function(){d.dataset.intro='done'},1700)}}catch(e){d.dataset.intro='skip'}})();`;

export default function IntroSplash() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: decide }} />
      <div className="intro-splash" aria-hidden="true">
        <div className="intro-mark">
          <span className="intro-word">
            {"Hiper".split("").map((c, i) => (
              <span key={i} style={{ ["--i" as string]: i }}>
                {c}
              </span>
            ))}
          </span>
          <span className="intro-word intro-word-red">
            {"Pozuelo".split("").map((c, i) => (
              <span key={i} style={{ ["--i" as string]: i + 5 }}>
                {c}
              </span>
            ))}
          </span>
        </div>
        <span className="intro-tagline">Tu casa lista en un pack</span>
        <span className="intro-bar" />
      </div>
    </>
  );
}
