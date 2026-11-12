/* =========================================================================
   Nicolás Debé · interacciones
   Reglas que me puse: el imán sólo en el CTA principal, nada persigue al
   cursor, todo se apaga con prefers-reduced-motion y nada es necesario
   para leer la página.
   ========================================================================= */
(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');

  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const punteroFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ------------------------------------------------------------------ *
   * Aparición al entrar en pantalla
   * ------------------------------------------------------------------ */
  const revelar = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      revelar.unobserve(e.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('[data-rev]').forEach((el) => revelar.observe(el));

  /* ------------------------------------------------------------------ *
   * Barra de arriba: se compacta al bajar y se esconde para no convivir
   * con la barra de acción de abajo en celular.
   * ------------------------------------------------------------------ */
  const nav = document.getElementById('nav');
  const barra = document.getElementById('mbar');
  let ultimoY = window.scrollY;

  function alScrollear() {
    const y = window.scrollY;
    if (nav) {
      nav.classList.toggle('is-stuck', y > 40);
      // sólo cambia cuando hubo movimiento real: un evento sin desplazamiento no lo trae de vuelta
      if (y !== ultimoY) nav.classList.toggle('is-hidden', y > ultimoY && y > 260);
    }
    if (barra) barra.classList.toggle('on', y > window.innerHeight * 0.6);
    ultimoY = y;
  }
  window.addEventListener('scroll', alScrollear, { passive: true });
  alScrollear();

  /* ------------------------------------------------------------------ *
   * Instagram en vivo. El incrustado oficial reemplaza la ficha fija por el
   * perfil real (seguidores y últimas publicaciones al momento). El script
   * de Instagram se pide recién cuando la sección se acerca a la pantalla.
   * ------------------------------------------------------------------ */
  const perfilVivo = document.getElementById('igLive');
  if (perfilVivo) {
    const pedirIncrustado = () => {
      if (document.getElementById('ig-embed-js')) return;
      const s = document.createElement('script');
      s.id = 'ig-embed-js';
      s.async = true;
      s.src = 'https://www.instagram.com/embed.js';
      document.body.appendChild(s);
    };
    if ('IntersectionObserver' in window) {
      const cerca = new IntersectionObserver((entradas) => {
        if (!entradas.some((e) => e.isIntersecting)) return;
        cerca.disconnect();
        pedirIncrustado();
      }, { rootMargin: '900px 0px' });
      cerca.observe(perfilVivo);
    } else {
      pedirIncrustado();
    }
  }

  /* ------------------------------------------------------------------ *
   * Hero: capas que se corren con el mouse. Amplitud chica, interpolada,
   * para que se sienta y no maree.
   * ------------------------------------------------------------------ */
  const collage = document.getElementById('collage');

  if (collage && punteroFino && !quieto) {
    const capas = [...collage.querySelectorAll('.collage-layer')];
    let objetivoX = 0, objetivoY = 0, x = 0, y = 0, animando = false;

    function cuadro() {
      x = lerp(x, objetivoX, 0.08);
      y = lerp(y, objetivoY, 0.08);

      capas.forEach((capa) => {
        const d = Number(capa.dataset.depth || 10) / 1000;
        capa.style.transform = `translate3d(${x * d * 100}px, ${y * d * 100}px, 0)`;
      });

      if (Math.abs(x - objetivoX) > 0.001 || Math.abs(y - objetivoY) > 0.001) {
        requestAnimationFrame(cuadro);
      } else {
        animando = false;
      }
    }

    document.querySelector('.hero').addEventListener('pointermove', (ev) => {
      objetivoX = (ev.clientX / window.innerWidth - 0.5) * 2;
      objetivoY = (ev.clientY / window.innerHeight - 0.5) * 2;
      if (!animando) { animando = true; requestAnimationFrame(cuadro); }
    });
  }

  /* ------------------------------------------------------------------ *
   * Imán, sólo en el CTA principal. Tope de 14 px y nunca se escapa
   * del cursor: se mueve hacia él, no en contra.
   * ------------------------------------------------------------------ */
  const cta = document.getElementById('ctaMain');
  if (cta && punteroFino && !quieto) {
    const TOPE = 14;
    let ix = 0, iy = 0, dx = 0, dy = 0, vivo = false;

    function imanCuadro() {
      ix = lerp(ix, dx, 0.14);
      iy = lerp(iy, dy, 0.14);
      cta.style.transform = `translate3d(${ix}px, ${iy}px, 0)`;
      if (Math.abs(ix - dx) > 0.05 || Math.abs(iy - dy) > 0.05) requestAnimationFrame(imanCuadro);
      else vivo = false;
    }
    function arrancar() { if (!vivo) { vivo = true; requestAnimationFrame(imanCuadro); } }

    cta.addEventListener('pointermove', (ev) => {
      const r = cta.getBoundingClientRect();
      dx = Math.max(-TOPE, Math.min(TOPE, (ev.clientX - (r.left + r.width / 2)) * 0.3));
      dy = Math.max(-TOPE, Math.min(TOPE, (ev.clientY - (r.top + r.height / 2)) * 0.3));
      arrancar();
    });
    cta.addEventListener('pointerleave', () => { dx = 0; dy = 0; arrancar(); });
  }

  /* ------------------------------------------------------------------ *
   * Video: reproducir con seguridad aunque esté con preload="none"
   * ------------------------------------------------------------------ */
  function reproducir(v) {
    if (!v) return;
    if (v.preload === 'none') v.preload = 'auto';
    const intentar = () => v.play().catch(() => {});
    if (v.readyState >= 2) intentar();
    else v.addEventListener('canplay', intentar, { once: true });
    intentar();
  }
  function frenar(v) { if (v) { v.pause(); } }

  /* ------------------------------------------------------------------ *
   * Recorrer la pieza con el eje X del mouse.
   * Mientras se mueve, va cuadro a cuadro; si se queda quieto, sigue sola.
   * ------------------------------------------------------------------ */
  function hacerRecorrible(caja, video, barraProgreso) {
    if (!video || !punteroFino) return;
    let reloj = null;

    caja.addEventListener('pointerenter', () => {
      caja.classList.add('playing');
      video.classList.add('ready');
      if (!quieto) reproducir(video);
    });

    caja.addEventListener('pointermove', (ev) => {
      if (quieto || !video.duration || !isFinite(video.duration)) return;
      const r = caja.getBoundingClientRect();
      const razon = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      video.pause();
      video.currentTime = video.duration * razon;
      if (barraProgreso) barraProgreso.style.width = `${razon * 100}%`;

      clearTimeout(reloj);
      reloj = setTimeout(() => reproducir(video), 520);
    });

    caja.addEventListener('pointerleave', () => {
      clearTimeout(reloj);
      caja.classList.remove('playing');
      video.classList.remove('ready');
      frenar(video);
      video.currentTime = 0;
      if (barraProgreso) barraProgreso.style.width = '0%';
    });
  }

  document.querySelectorAll('[data-scrub]').forEach((caja) => {
    hacerRecorrible(caja, caja.querySelector('video'), null);
  });

  /* ------------------------------------------------------------------ *
   * Caso: el día visible manda sobre el teléfono.
   * Se calcula por scroll (no por cruces) para que no se desincronice
   * al saltar con un ancla o con el teclado.
   * ------------------------------------------------------------------ */
  const pasos = [...document.querySelectorAll('.step')];
  const slides = [...document.querySelectorAll('.slide')];
  const telefono = document.getElementById('phone');
  const barraScrub = document.getElementById('scrubBar');

  if (pasos.length && slides.length) {
    let actual = -1;

    function mostrar(i) {
      if (i === actual) return;
      actual = i;
      pasos.forEach((p, n) => p.classList.toggle('on', n === i));
      slides.forEach((s, n) => {
        const encendida = n === i;
        s.classList.toggle('on', encendida);
        const v = s.querySelector('video');
        if (!v) return;
        if (encendida && !quieto) { v.classList.add('ready'); reproducir(v); }
        else { frenar(v); v.classList.remove('ready'); }
      });
    }

    function elegir() {
      const medio = window.innerHeight / 2;
      let mejor = 0, dist = Infinity;
      pasos.forEach((p, n) => {
        const r = p.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - medio);
        if (d < dist) { dist = d; mejor = n; }
      });
      mostrar(mejor);
    }
    // El scroll ya llega a lo sumo una vez por cuadro: medir cinco cajas ahí es barato.
    window.addEventListener('scroll', elegir, { passive: true });
    window.addEventListener('resize', elegir, { passive: true });
    elegir();

    // el teléfono también se recorre con el mouse
    if (telefono) {
      let reloj = null;
      telefono.addEventListener('pointermove', (ev) => {
        const v = slides[actual] && slides[actual].querySelector('video');
        if (!v || quieto || !v.duration || !isFinite(v.duration)) return;
        const r = telefono.getBoundingClientRect();
        const razon = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
        v.pause();
        v.currentTime = v.duration * razon;
        if (barraScrub) barraScrub.style.width = `${razon * 100}%`;
        clearTimeout(reloj);
        reloj = setTimeout(() => reproducir(v), 520);
      });
      telefono.addEventListener('pointerleave', () => {
        clearTimeout(reloj);
        const v = slides[actual] && slides[actual].querySelector('video');
        if (v && !quieto) reproducir(v);
      });
    }
  }

  /* ------------------------------------------------------------------ *
   * Celular: historias deslizables.
   * La que queda centrada se enciende; los puntos marcan dónde estás.
   * ------------------------------------------------------------------ */
  document.querySelectorAll('[data-rail]').forEach((riel) => {
    const pista = riel.querySelector('[data-rail-track]');
    const puntos = riel.querySelector('[data-rail-dots]');
    const historias = [...pista.querySelectorAll('.story')];
    if (!historias.length) return;

    if (puntos) {
      historias.forEach(() => puntos.appendChild(document.createElement('b')));
    }
    const bolitas = puntos ? [...puntos.children] : [];

    function encender(i) {
      historias.forEach((h, n) => {
        const on = n === i;
        h.classList.toggle('live', on);

        if (on && h.dataset.video) {
          let v = h.querySelector('video');
          if (!v) {
            v = document.createElement('video');
            v.src = h.dataset.video;
            v.muted = true; v.loop = true; v.playsInline = true;
            v.setAttribute('playsinline', ''); v.setAttribute('aria-hidden', 'true');
            h.insertBefore(v, h.firstChild.nextSibling);
          }
          if (!quieto) reproducir(v);
        } else {
          frenar(h.querySelector('video'));
        }
      });
      bolitas.forEach((b, n) => b.classList.toggle('on', n === i));
    }

    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          encender(historias.indexOf(e.target));
        }
      });
    }, { root: pista, threshold: [0.6, 0.9] });

    historias.forEach((h) => observador.observe(h));
    encender(0);
  });

  /* ------------------------------------------------------------------ *
   * Al volver a la pestaña el navegador deja los videos pausados
   * ------------------------------------------------------------------ */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || quieto) return;
    document.querySelectorAll('.slide.on video, .story.live video').forEach(reproducir);
  });
})();
