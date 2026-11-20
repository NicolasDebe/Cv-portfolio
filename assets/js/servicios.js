/* =========================================================================
   Nicolás Debé · servicios · escenas
   GSAP + ScrollTrigger + SplitText, scroll suave con Lenis.
   Todo arranca de lo que ya se ve en el HTML: si una librería no llega,
   la página se lee igual. Con movimiento reducido no hay escenas.
   ========================================================================= */
(() => {
  'use strict';

  const d = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const punteroFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hayGsap = !!(window.gsap && window.ScrollTrigger);

  const guardar = () => { try { sessionStorage.setItem('svc-intro', '1'); } catch (e) {} };

  /* ------------------------------------------------------------------ *
   * Sin GSAP: se apaga la intro y queda todo lo que no depende de él.
   * ------------------------------------------------------------------ */
  if (!hayGsap) {
    d.classList.remove('intro-on');
    guardar();
    $$('.s-hero-title, .mk').forEach((el) => { el.style.animation = 'none'; el.style.opacity = 1; });
  }

  /* ------------------------------------------------------------------ *
   * Barra de arriba y barra de acción de celular (igual que la landing)
   * ------------------------------------------------------------------ */
  const nav = $('#nav');
  const barra = $('#mbar');
  let ultimoY = window.scrollY;
  function alScrollear() {
    const y = window.scrollY;
    nav.classList.toggle('is-stuck', y > 40);
    if (y !== ultimoY) nav.classList.toggle('is-hidden', y > ultimoY && y > 260);
    if (barra) barra.classList.toggle('on', y > window.innerHeight * 0.6);
    ultimoY = y;
  }
  window.addEventListener('scroll', alScrollear, { passive: true });
  alScrollear();

  /* ------------------------------------------------------------------ *
   * Visor de referencias: el incrustado oficial de Instagram se pide
   * recién cuando alguien abre una cuenta.
   * ------------------------------------------------------------------ */
  const visor = $('#viewer');
  const visorEmbed = $('#viewerEmbed');
  // fuera de la sección: si no, su contexto de apilamiento lo deja debajo de la barra
  document.body.appendChild(visor);
  let lenis = null;
  let abridor = null;

  function pedirScriptInstagram() {
    if (window.instgrm && window.instgrm.Embeds) { window.instgrm.Embeds.process(); return; }
    if ($('#ig-embed-js')) return;
    const s = document.createElement('script');
    s.id = 'ig-embed-js';
    s.async = true;
    s.src = 'https://www.instagram.com/embed.js';
    document.body.appendChild(s);
  }

  function abrirVisor(cuenta, boton) {
    abridor = boton;
    const url = `https://www.instagram.com/${cuenta}/`;
    $('#viewerT').textContent = '@' + cuenta;
    $('#viewerGo').href = url;
    visorEmbed.innerHTML = '';
    const bq = document.createElement('blockquote');
    bq.className = 'instagram-media';
    bq.setAttribute('data-instgrm-permalink', url);
    bq.setAttribute('data-instgrm-version', '14');
    bq.innerHTML = `<div class="viewer-wait tag">Cargando el perfil de @${cuenta}…<br />Si no aparece, abrilo en Instagram.</div>`;
    visorEmbed.appendChild(bq);
    visor.hidden = false;
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
    pedirScriptInstagram();
    $('.viewer-x', visor).focus();
    if (hayGsap && !quieto) {
      gsap.fromTo('.viewer-bg', { opacity: 0 }, { opacity: 1, duration: 0.35 });
      gsap.fromTo('.viewer-sheet', { y: 80, rotation: -5, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: 0.7, ease: 'expo.out' });
    }
  }

  function cerrarVisor() {
    const fin = () => {
      visor.hidden = true;
      visorEmbed.innerHTML = '';
      document.body.style.overflow = '';
      if (lenis) lenis.start();
      if (abridor) abridor.focus();
    };
    if (hayGsap && !quieto) {
      gsap.to('.viewer-sheet', { y: 60, rotation: 4, opacity: 0, duration: 0.3, ease: 'power2.in' });
      gsap.to('.viewer-bg', { opacity: 0, duration: 0.3, onComplete: fin });
    } else fin();
  }

  // delegado: también sirve para las copias que arma la cinta infinita
  let arrastroCinta = false;
  $('#refs').addEventListener('click', (e) => {
    const b = e.target.closest('.ref');
    if (!b || arrastroCinta) return;
    abrirVisor(b.dataset.ig, b);
  });
  $$('[data-close]', visor).forEach((el) => el.addEventListener('click', cerrarVisor));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !visor.hidden) cerrarVisor(); });

  if (!hayGsap) return;

  /* =================================================================== *
   *                              CON GSAP
   * =================================================================== */
  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  // Sin máscara: Anton tiene interlineado .86 y una máscara le cortaría la punta a cada letra.
  // Las letras van dentro de palabras para que el renglón nunca se corte a mitad de palabra.
  const partir = (el, type) => (window.SplitText ? SplitText.create(el, { type: type === 'chars' ? 'words,chars' : type }) : null);
  d.classList.add('gs');

  // trazo dibujado: deja el path listo para animar su largo real
  // (el corrimiento extra evita que la punta redondeada quede como un punto suelto)
  function prepararTrazo(path) {
    const largo = path.getTotalLength();
    const oculto = largo + 30;
    gsap.set(path, { strokeDasharray: `${largo} ${largo + 60}`, strokeDashoffset: quieto ? 0 : oculto });
    return oculto;
  }

  /* ------------------------------------------------------------------ *
   * Scroll suave
   * ------------------------------------------------------------------ */
  if (!quieto && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const destino = document.querySelector(id);
    if (!destino) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(destino, { offset: 0, duration: 1.4 });
    else destino.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth' });
  }));

  /* ------------------------------------------------------------------ *
   * Cursor propio
   * ------------------------------------------------------------------ */
  const cur = $('#cur');
  const curT = $('#curT');
  if (punteroFino && !quieto) {
    d.classList.add('has-cur');
    const xA = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
    const yA = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener('pointermove', (e) => { xA(e.clientX); yA(e.clientY); cur.classList.remove('is-gone'); }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.add('is-gone'));
    document.addEventListener('pointerover', (e) => {
      const conTexto = e.target.closest('[data-cur]');
      const interactivo = e.target.closest('a, button, summary');
      cur.classList.toggle('is-label', !!conTexto);
      cur.classList.toggle('is-link', !conTexto && !!interactivo);
      curT.textContent = conTexto ? conTexto.dataset.cur : '';
    });
    document.addEventListener('pointerdown', () => gsap.to(cur, { scale: 0.8, duration: 0.15 }));
    document.addEventListener('pointerup', () => gsap.to(cur, { scale: 1, duration: 0.3, ease: 'back.out(3)' }));
  }

  /* ------------------------------------------------------------------ *
   * Imán en los botones principales (tope de 14 px)
   * ------------------------------------------------------------------ */
  if (punteroFino && !quieto) {
    ['#ctaMain', '#ctaEnd'].forEach((sel) => {
      const btn = $(sel);
      if (!btn) return;
      const xI = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' });
      const yI = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        xI(gsap.utils.clamp(-14, 14, (e.clientX - r.left - r.width / 2) * 0.3));
        yI(gsap.utils.clamp(-14, 14, (e.clientY - r.top - r.height / 2) * 0.4));
      });
      btn.addEventListener('pointerleave', () => { xI(0); yI(0); });
    });
  }

  /* ------------------------------------------------------------------ *
   * Entrada del hero (después de la intro, si la hay)
   * ------------------------------------------------------------------ */
  const titulo = $('#heroTitle');
  const mks = $$('[data-mk]');
  titulo.style.animation = 'none';
  titulo.style.opacity = 1;
  // la inclinación de cada pieza se lee del CSS antes de que GSAP tome el transform
  const inclin = new Map(mks.map((mk) => [mk, parseFloat(getComputedStyle(mk).rotate) || 0]));

  function entradaHero() {
    if (quieto) return;
    // todo entra en ~1,1 s: rápido, pero en capas
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    const sp = partir($$('.ln', titulo), 'chars');
    if (sp) tl.from(sp.chars, { yPercent: 60, opacity: 0, rotation: 6, stagger: 0.011, duration: 0.75 }, 0);
    tl.from('.s-hero .hero-kick', { y: 16, opacity: 0, duration: 0.5 }, 0)
      .from('#heroLede, #heroCta', { y: 20, opacity: 0, stagger: 0.06, duration: 0.6 }, 0.2)
      .from('.stage > .stage-disc', { scale: 0, duration: 0.9, ease: 'elastic.out(1, .75)' }, 0)
      .from('#stageCut', { y: 90, opacity: 0, duration: 0.8 }, 0.05)
      .fromTo(mks,
        { scale: 0.3, opacity: 0, rotation: (i, el) => inclin.get(el) + gsap.utils.random(-30, 30) },
        { scale: 1, opacity: 1, rotation: (i, el) => inclin.get(el), stagger: { each: 0.04, from: 'random' }, duration: 0.75, ease: 'back.out(1.7)' },
        0.15);
    return tl;
  }

  // flotación suave y paralaje con el mouse: canales propios (yPercent y translate),
  // para no pisar el x/y que usa la convergencia
  function flotar() {
    if (quieto) return;
    mks.forEach((mk, i) => {
      gsap.to(mk, { yPercent: gsap.utils.random(-5, 5), duration: gsap.utils.random(2.4, 3.6), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2 });
    });
    if (!punteroFino) return;
    const stage = $('#stage');
    let ox = 0, oy = 0, cx = 0, cy = 0;
    stage.closest('.s-hero').addEventListener('pointermove', (e) => {
      ox = (e.clientX / window.innerWidth - 0.5) * 2;
      oy = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    gsap.ticker.add(() => {
      cx += (ox - cx) * 0.06;
      cy += (oy - cy) * 0.06;
      mks.forEach((mk) => {
        const p = Number(mk.dataset.depth || 20);
        mk.style.translate = `${(cx * p).toFixed(2)}px ${(cy * p * 0.6).toFixed(2)}px`;
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Intro: la hoja se rasga
   * ------------------------------------------------------------------ */
  function arrancar() {
    entradaHero();
    flotar();
  }

  if (d.classList.contains('intro-on')) {
    if (lenis) lenis.stop();
    const tl = gsap.timeline({
      onComplete: () => {
        d.classList.remove('intro-on');
        guardar();
        if (lenis) lenis.start();
        ScrollTrigger.refresh();
      },
    });
    // ~1,1 s en total; el hero arranca mientras la hoja todavía se abre
    tl.from('.intro-txt > *', { yPercent: 110, opacity: 0, stagger: 0.06, duration: 0.4, ease: 'expo.out' })
      .to('.intro-txt', { opacity: 0, scale: 0.95, duration: 0.18, ease: 'power2.in' }, '+=0.08')
      .to('.intro-top', { yPercent: -108, rotation: -4, duration: 0.65, ease: 'expo.inOut' }, '-=0.08')
      .to('.intro-bot', { yPercent: 108, rotation: 3, duration: 0.65, ease: 'expo.inOut' }, '<')
      .add(arrancar, '-=0.45');
    // tocar una tecla, la rueda o la pantalla la saltea
    const saltar = () => { if (tl.progress() < 1) tl.progress(1); };
    $('#introSkip').addEventListener('click', saltar);
    ['keydown', 'wheel', 'touchstart'].forEach((ev) => window.addEventListener(ev, saltar, { once: true, passive: true }));
  } else {
    arrancar();
  }

  /* ------------------------------------------------------------------ *
   * Títulos de sección: letra por letra al entrar
   * ------------------------------------------------------------------ */
  if (!quieto) {
    $$('[data-chars]').forEach((h) => {
      const sp = partir(h, 'chars');
      if (!sp) return;
      gsap.from(sp.chars, {
        yPercent: 110, rotation: 4, stagger: 0.025, duration: 1, ease: 'expo.out',
        scrollTrigger: { trigger: h, start: 'top 85%', once: true },
      });
    });
    $$('.head-k, .head-s').forEach((el) => {
      if (el.closest('.s-hero')) return;
      gsap.from(el, { y: 24, opacity: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
  }

  /* ------------------------------------------------------------------ *
   * Marquesina: acelera y cambia de sentido con el scroll
   * ------------------------------------------------------------------ */
  const pista = $('#svcMarquee');
  if (pista && !quieto) {
    const loop = gsap.to(pista, { xPercent: -50, ease: 'none', duration: 28, repeat: -1 });
    loop.totalTime(loop.duration() * 50);
    let sentido = 1;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate(self) {
        sentido = self.direction;
        const v = Math.min(Math.abs(self.getVelocity()) / 220, 7);
        gsap.to(loop, { timeScale: sentido * (1 + v), duration: 0.25, overwrite: true });
        gsap.to(loop, { timeScale: sentido, duration: 1.2, delay: 0.25 });
      },
    });
  }

  /* ------------------------------------------------------------------ *
   * Escenas que cambian entre escritorio y celular
   * ------------------------------------------------------------------ */
  const mm = gsap.matchMedia();
  const NORMAL = '(prefers-reduced-motion: no-preference)';

  mm.add({ desk: `(min-width: 861px) and ${NORMAL}`, mob: `(max-width: 860px) and ${NORMAL}` }, (ctx) => {
    const { desk } = ctx.conditions;

    /* ---------- HERO: todo converge en el teléfono ---------- */
    const telefono = $('#heroPhone');
    const video = $('video', telefono);
    const flecha = $$('.stage-arrow path');
    flecha.forEach(prepararTrazo);

    const centroTel = () => ({ x: telefono.offsetLeft, y: telefono.offsetTop });
    const hacia = (mk, eje) => {
      const c = centroTel();
      return eje === 'x' ? c.x - (mk.offsetLeft + mk.offsetWidth / 2) : c.y - (mk.offsetTop + mk.offsetHeight / 2);
    };
    const visibles = mks.filter((m) => getComputedStyle(m).display !== 'none');

    const conv = gsap.timeline({
      scrollTrigger: {
        trigger: desk ? '#heroPin' : '#stage',
        start: desk ? 'top top' : 'top 22%',
        end: desk ? '+=140%' : 'bottom 15%',
        pin: desk,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          if (self.progress > 0.42) { if (video.paused) video.play().catch(() => {}); }
          else if (!video.paused) video.pause();
        },
      },
    });
    // valores de partida explícitos: nunca se leen a mitad de la entrada
    conv.fromTo(visibles,
      { x: 0, y: 0, scale: 1, opacity: 1, rotation: (i, el) => inclin.get(el) },
      {
        x: (i, el) => hacia(el, 'x'), y: (i, el) => hacia(el, 'y'),
        scale: 0.2, rotation: 0, opacity: 0, ease: 'power2.in', stagger: 0.05, duration: 1, immediateRender: false,
      }, 0)
      .to('#stageCut', { scale: 0.95, filter: 'brightness(.7) drop-shadow(0 30px 46px rgba(8,18,12,.5))', duration: 1 }, 0)
      .fromTo(telefono, { scale: 0.5, opacity: 0, rotation: -10 }, { scale: 1, opacity: 1, rotation: 0, ease: 'back.out(1.5)', duration: 0.8 }, 0.55)
      .to(flecha, { strokeDashoffset: 0, duration: 0.5, stagger: 0.2 }, 0.9)
      .from('#heroNote', { opacity: 0, x: -30, duration: 0.5 }, 0.9)
      .to('.s-hero-scroll', { opacity: 0, duration: 0.2 }, 0);
    if (desk) conv.to({}, { duration: 0.4 });

    /* ---------- MÉTODO: scroll horizontal ---------- */
    const pista3 = $('#metTrack');
    const panel3 = $('.pan[data-pan="3"]');
    const vid = $('#scrubVid');
    const edHead = $('#edHead');
    const edTime = $('#edTime');
    let ultimoT = -1;
    let pedidoVid = false;

    function moverVideo(p) {
      p = gsap.utils.clamp(0, 1, p);
      edHead.style.setProperty('--p', p.toFixed(4));
      const seg = 44 + p * 12;
      const ss = Math.floor(seg);
      const ff = Math.floor((seg - ss) * 20);
      edTime.textContent = `00:${String(ss).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
      if (!vid.duration) return;
      const t = p * (vid.duration - 0.06);
      if (Math.abs(t - ultimoT) < 1 / 30) return;
      ultimoT = t;
      if (!pedidoVid) {
        pedidoVid = true;
        requestAnimationFrame(() => { vid.currentTime = ultimoT; pedidoVid = false; });
      }
    }

    // escenas de los paneles 2 y 3 en escritorio: se disparan cuando el panel
    // cruza el 60 % de la pantalla durante el recorrido horizontal
    const pendientes = [];
    const dist = () => Math.max(1, pista3.scrollWidth - window.innerWidth);
    const umbral = (panel) => gsap.utils.clamp(0, 1, (panel.offsetLeft - window.innerWidth * 0.6) / dist());

    if (desk) {
      const sec = $('#metodo');
      sec.classList.add('is-h');
      const EXTRA = 0.45; // pausa al final para mover el video con calma
      const tlH = gsap.timeline({
        scrollTrigger: {
          trigger: '#metPin', start: 'top top', end: () => '+=' + dist() * (1 + EXTRA),
          pin: true, scrub: 1, invalidateOnRefresh: true,
          onUpdate(self) {
            const enTrack = self.progress * (1 + EXTRA);
            pendientes.forEach((p) => { if (!p.hecho && enTrack >= umbral(p.panel)) { p.hecho = true; p.tl.play(); } });
            const i3 = gsap.utils.clamp(0, 1, (panel3.offsetLeft - window.innerWidth * 0.5) / dist());
            moverVideo((enTrack - i3) / (1 + EXTRA - i3));
          },
        },
      });
      tlH.to(pista3, { x: () => -dist(), ease: 'none', duration: 1 }).to({}, { duration: EXTRA });
    } else {
      ScrollTrigger.create({
        trigger: '.mk-ed', start: 'top 85%', end: 'bottom 15%', scrub: true,
        onUpdate: (self) => moverVideo(self.progress),
      });
    }

    const alEntrar = (panel, crear) => {
      const tl = crear();
      tl.pause();
      if (desk && panel.dataset.pan !== '1') { pendientes.push({ panel, tl, hecho: false }); return; }
      ScrollTrigger.create({ trigger: panel, start: 'top 72%', once: true, onEnter: () => tl.play() });
    };

    $$('.pan').forEach((panel) => {
      alEntrar(panel, () => gsap.timeline().from($$('.pan-txt > *', panel), { y: 40, opacity: 0, stagger: 0.09, duration: 0.9, ease: 'expo.out' }));
    });

    // panel 1: se escribe el pedido y se llena el calendario
    const chatMe = $('#chatMe');
    const textoPedido = chatMe.textContent.trim();
    alEntrar($('.pan[data-pan="1"]'), () => {
      const contador = { n: 0 };
      return gsap.timeline()
        .add(() => { chatMe.textContent = ''; chatMe.classList.add('typing'); })
        .to(contador, {
          n: textoPedido.length, duration: 2.4, ease: 'none',
          onUpdate: () => { chatMe.textContent = textoPedido.slice(0, Math.round(contador.n)); },
        }, 0.3)
        .add(() => chatMe.classList.remove('typing'))
        .from('.chat-ai', { opacity: 0, y: 14, duration: 0.5 })
        .from('.chat-ai-dot', { scale: 0, duration: 0.6, ease: 'back.out(3)' }, '<')
        .from('#cal > span:not(.cal-h)', { opacity: 0, scale: 0.6, duration: 0.3, stagger: { each: 0.025, from: 'start' } }, '-=0.2')
        .from('#cal [class^="c-"]', { scale: 0, rotation: () => gsap.utils.random(-20, 20), duration: 0.5, ease: 'back.out(2.5)', stagger: 0.08 }, '-=0.4');
    });

    // panel 2: un cursor «Claude» toma cada token y arma un post y una historia con él.
    // Todo con valores de partida y de llegada explícitos (clip-path desde «none» no se interpola).
    alEntrar($('.pan[data-pan="2"]'), () => {
      const body = $('#dzBody');
      const cur = $('#dzCur');
      const sel = $('#dzSel');
      const tok = (n) => $(`.dz-tok[data-dz="${n}"]`, body);
      const rel = (el) => {
        const r = el.getBoundingClientRect();
        const b = body.getBoundingClientRect();
        return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
      };
      const LLENO = 'inset(0% 0% 0% 0%)';
      const destapar = (el, desde, dur = 0.42, ease = 'expo.inOut') =>
        gsap.fromTo(el, { clipPath: desde }, { clipPath: LLENO, duration: dur, ease, clearProps: 'clipPath' });
      const aparecer = (el) => gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      const subrayado = $('.ab-key path', body);
      const oculto = prepararTrazo(subrayado);

      const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
      const ir = (el, fx, fy) => tl.to(cur, {
        x: () => { const p = rel(el); return p.x + p.w * fx; },
        y: () => { const p = rel(el); return p.y + p.h * fy; },
        duration: 0.3,
      });
      const tocar = (t) => {
        tl.add(() => { $$('.dz-tok.is-on', body).forEach((e) => e.classList.remove('is-on')); t.classList.add('is-on'); });
        tl.to(cur, { scale: 0.8, duration: 0.07, yoyo: true, repeat: 1, ease: 'power1.inOut' });
      };
      const marcar = (el) => tl.to(sel, {
        x: () => rel(el).x - 4, y: () => rel(el).y - 4,
        width: () => rel(el).w + 8, height: () => rel(el).h + 8,
        opacity: 1, duration: 0.25, ease: 'power3.out',
      });
      const paso = (nombre, destino, revelar) => {
        ir(tok(nombre), 0.7, 0.55);
        tocar(tok(nombre));
        ir(destino, 0.5, 0.45);
        marcar(destino);
        revelar();
      };

      tl.set(cur, { x: () => rel(tok('crema')).x + 110, y: () => rel(tok('crema')).y - 24 })
        .to(cur, { opacity: 1, duration: 0.2 });

      paso('crema', $('.ab-post .ab-bg'), () => tl.add(destapar('.ab-post .ab-bg', 'inset(0% 0% 100% 0%)'), '<'));
      paso('bosque', $('.ab-story .ab-bg'), () => tl.add(destapar('.ab-story .ab-bg', 'inset(100% 0% 0% 0%)'), '<'));
      paso('titular', $('.ab-head'), () => tl.add(destapar('.ab-head', 'inset(0% 100% 0% 0%)', 0.6, 'steps(12)'), '<'));
      paso('clave', $('.ab-post .ab-key'), () => {
        tl.add(destapar('.ab-post .ab-key', 'inset(100% 0% 0% 0%)', 0.45, 'expo.out'), '<');
        tl.add(destapar('.ab-key--s', 'inset(100% 0% 0% 0%)', 0.45, 'expo.out'), '<0.12');
      });
      paso('madera', $('.ab-light .ab-kick'), () => {
        tl.add(aparecer('.ab-light .ab-kick'), '<');
        tl.fromTo(subrayado, { strokeDashoffset: oculto }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.inOut' }, '<');
      });
      paso('cian', $('.ab-poll'), () => {
        tl.add(aparecer('.ab-kick--c'), '<');
        tl.add(destapar('.ab-poll', 'inset(0% 0% 100% 0%)', 0.4), '<');
        tl.add(gsap.fromTo('.ab-opt i', { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'expo.out', stagger: 0.1 }), '-=0.1');
      });

      tl.to(sel, { opacity: 0, duration: 0.2 })
        .add(gsap.fromTo('.ab-tape', { y: -36, rotation: -28, opacity: 0 }, { y: 0, rotation: -3, opacity: 1, duration: 0.55, ease: 'back.out(2)' }), '<')
        .add(gsap.fromTo('.ab-body, .ab-sign, .ab-pag, .ab-bars, .ab-reply', { opacity: 0 }, { opacity: 1, duration: 0.35, stagger: 0.05 }), '<')
        .to(cur, { x: '+=36', y: '+=28', opacity: 0, duration: 0.45 }, '+=0.15')
        .add(() => $$('.dz-tok.is-on', body).forEach((e) => e.classList.remove('is-on')), '<');
      return tl;
    });

    /* ---------- ANILLO 3D (sólo escritorio) ---------- */
    if (desk) anillo3d();

    // al pasar a celular, el método vuelve a apilarse en vertical
    return () => $('#metodo').classList.remove('is-h');
  });

  /* ------------------------------------------------------------------ *
   * Manifiesto: las palabras se encienden con el scroll
   * ------------------------------------------------------------------ */
  if (!quieto) {
    const mani = $('#maniT');
    const sp = window.SplitText ? SplitText.create(mani, { type: 'words' }) : null;
    if (sp) {
      gsap.fromTo(sp.words, { opacity: 0.13 }, {
        opacity: 1, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: mani, start: 'top 78%', end: 'bottom 45%', scrub: true },
      });
    }
    const sub = $('.mani-under path');
    const l = prepararTrazo(sub);
    gsap.fromTo(sub, { strokeDashoffset: l }, {
      strokeDashoffset: 0, duration: 1, ease: 'power2.inOut',
      scrollTrigger: { trigger: '.s-mani-t .key', start: 'top 62%', toggleActions: 'play none none reverse' },
    });
    gsap.from('#stamp', {
      scale: 2.6, rotation: 28, opacity: 0, duration: 0.7, ease: 'back.out(2.2)',
      scrollTrigger: { trigger: '#stamp', start: 'top 85%', once: true },
    });
    gsap.from('.s-mani-foot p', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.s-mani-foot', start: 'top 88%', once: true } });
  }

  /* ------------------------------------------------------------------ *
   * Servicios: las hojas se apilan y cada una anima su mockup
   * ------------------------------------------------------------------ */
  if (!quieto) {
    const hojas = $$('.sheet');
    hojas.forEach((hoja, i) => {
      const sig = hojas[i + 1];
      if (sig) {
        // La de atrás se achica y se sombrea recién cuando la siguiente ya la está tapando.
        // Sombra con una capa (--sombra), no con filter: GSAP interpola filter desde
        // brightness(0) y la hoja se ponía negra.
        gsap.fromTo(hoja, { scale: 1, rotation: 0, '--sombra': 0 }, {
          scale: 0.92 + i * 0.012, rotation: i % 2 ? 1.2 : -1.2, '--sombra': 0.14, ease: 'none',
          // termina cuando la siguiente llega a su lugar fijo (su top de sticky)
          scrollTrigger: { trigger: sig, start: 'top 55%', end: () => `top ${parseFloat(getComputedStyle(sig).top) + 10}px`, scrub: true, invalidateOnRefresh: true },
        });
      }
      gsap.from(hoja, { y: 80, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: hoja, start: 'top 92%', once: true } });
    });

    const enVista = (el, tl) => ScrollTrigger.create({
      trigger: el, start: 'top 85%', end: 'bottom top',
      onToggle: (self) => (self.isActive ? tl.play() : tl.pause()),
    });

    // 01 · posters que giran de a uno
    const flips = $$('.flip');
    const tlFlip = gsap.timeline({ repeat: -1, paused: true });
    flips.forEach((f) => tlFlip.call(() => f.classList.toggle('on'), null, '+=0.55'));
    enVista('.sm-flip', tlFlip);

    // 02 · el embudo se arma y queda con un brillo que baja
    const fun = $('.sm-fun');
    gsap.from('.fun-row', {
      scaleX: 0, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.15,
      scrollTrigger: { trigger: fun, start: 'top 80%', once: true, onEnter: () => fun.classList.add('is-on') },
    });

    // 03 · la conversación, en loop
    const burbujas = $$('.sm-chat .b');
    gsap.set(burbujas, { opacity: 0, y: 14 });
    gsap.set(burbujas[1], { display: 'none' });
    const tlChat = gsap.timeline({ repeat: -1, repeatDelay: 1.2, paused: true });
    tlChat.to(burbujas[0], { opacity: 1, y: 0, duration: 0.45, ease: 'back.out(2)' })
      .set(burbujas[1], { display: 'flex' }, '+=0.4')
      .to(burbujas[1], { opacity: 1, y: 0, duration: 0.3 })
      .to(burbujas[1], { opacity: 0, duration: 0.2 }, '+=0.9')
      .set(burbujas[1], { display: 'none' })
      .to(burbujas[2], { opacity: 1, y: 0, duration: 0.45, ease: 'back.out(2)' }, '<')
      .to(burbujas[3], { opacity: 1, y: 0, duration: 0.45, ease: 'back.out(2)' }, '+=0.9')
      .to(burbujas[4], { opacity: 1, y: 0, duration: 0.45, ease: 'back.out(2)' }, '+=0.9')
      .to(burbujas, { opacity: 0, y: -10, duration: 0.4, stagger: 0.04 }, '+=2');
    enVista('.sm-chat', tlChat);

    // 04 · la comunidad suma miembros
    const nodos = $$('.com-node');
    const tlCom = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
    tlCom.from('.com-core', { scale: 0.7, duration: 0.6, ease: 'back.out(2.5)' })
      .from(nodos, { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(3)', stagger: { each: 0.18, from: 'random' } }, '-=0.2')
      .fromTo('.com-pill', { y: 16, opacity: 0, scale: 0.8 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)' }, '-=0.6')
      .to('.com-pill', { opacity: 0, y: -10, duration: 0.3 }, '+=1.4')
      .to(nodos, { scale: 0, opacity: 0, duration: 0.3, stagger: 0.03 }, '+=0.2');
    enVista('.sm-com', tlCom);
  }

  /* ------------------------------------------------------------------ *
   * Anillo 3D de piezas propias: gira con el scroll y se arrastra
   * ------------------------------------------------------------------ */
  function anillo3d() {
    const zona = $('#ringWrap');
    const ring = $('#ring');
    const items = $$('.ring-it', ring);
    const n = items.length;
    const paso = 360 / n;
    const titulo = $('#ringTitle');
    const kicker = $('#ringK');
    let radio = 0;
    zona.classList.add('is-3d');

    const ubicar = () => {
      const w = ring.offsetWidth;
      radio = Math.round((w + 34) / (2 * Math.tan(Math.PI / n)));
      items.forEach((it, i) => { it.style.transform = `rotateY(${i * paso}deg) translateZ(${radio}px)`; });
    };
    ubicar();
    window.addEventListener('resize', ubicar);

    let porScroll = 0, porArrastre = 0, actual = 0, inercia = 0, frente = -1, arrastrando = false, movio = 0, ultimoX = 0;

    ScrollTrigger.create({
      trigger: zona, start: 'top bottom', end: 'bottom top', scrub: true,
      onUpdate: (self) => { porScroll = -self.progress * 160; },
      onToggle: (self) => {
        if (self.isActive) gsap.ticker.add(cuadro);
        else { gsap.ticker.remove(cuadro); pausarTodo(); }
      },
    });

    function pausarTodo() { $$('video', ring).forEach((v) => v.pause()); }

    function ponerFrente(i) {
      if (i === frente) return;
      if (frente >= 0) {
        items[frente].classList.remove('is-front');
        const v = $('video', items[frente]);
        if (v) v.pause();
      }
      frente = i;
      const it = items[i];
      it.classList.add('is-front');
      titulo.textContent = it.dataset.t;
      kicker.textContent = it.dataset.k;
      gsap.fromTo([titulo, kicker], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'expo.out', stagger: 0.05 });
      let v = $('video', it);
      if (!v) {
        v = document.createElement('video');
        v.src = it.dataset.video;
        v.muted = true; v.loop = true; v.playsInline = true;
        v.setAttribute('aria-hidden', 'true');
        it.appendChild(v);
      }
      v.play().catch(() => {});
    }

    function cuadro() {
      if (!arrastrando) { porArrastre += inercia; inercia *= 0.94; }
      actual += (porScroll + porArrastre - actual) * 0.1;
      ring.style.transform = `translateZ(${-radio}px) rotateY(${actual}deg)`;
      const i = ((Math.round(-actual / paso) % n) + n) % n;
      ponerFrente(i);
    }

    zona.addEventListener('pointerdown', (e) => {
      arrastrando = true; movio = 0; ultimoX = e.clientX; inercia = 0;
      zona.setPointerCapture(e.pointerId);
    });
    zona.addEventListener('pointermove', (e) => {
      if (!arrastrando) return;
      const dx = e.clientX - ultimoX;
      ultimoX = e.clientX;
      movio += Math.abs(dx);
      porArrastre += dx * 0.28;
      inercia = dx * 0.28;
    });
    const soltar = () => { arrastrando = false; };
    zona.addEventListener('pointerup', soltar);
    zona.addEventListener('pointercancel', soltar);
    // un arrastre no es un click: no abre Instagram
    items.forEach((it) => it.addEventListener('click', (e) => { if (movio > 6) e.preventDefault(); }));
    items.forEach((it) => it.addEventListener('dragstart', (e) => e.preventDefault()));

    gsap.from(items, {
      opacity: 0, y: 80, stagger: 0.05, duration: 1, ease: 'expo.out',
      scrollTrigger: { trigger: zona, start: 'top 80%', once: true },
    });
  }

  /* ------------------------------------------------------------------ *
   * Referencias: cinta infinita que avanza sola. Frena al pasar el mouse
   * (o al enfocar una tarjeta) y se puede arrastrar. El scroll no la mueve.
   * ------------------------------------------------------------------ */
  if (!quieto) {
    const zona = $('#refs');
    const track = $('#refsTrack');
    const originales = $$('.ref', track);

    gsap.from(originales, { y: 90, rotation: () => gsap.utils.random(-6, 6), opacity: 0, stagger: 0.07, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: zona, start: 'top 85%', once: true } });

    // una copia del juego completo, para que el loop no tenga costura
    originales.forEach((b) => {
      const c = b.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      c.tabIndex = -1;
      track.appendChild(c);
    });
    zona.classList.add('is-auto');
    d.classList.add('refs-auto');

    const VEL = 42; // px por segundo
    let mitad = 0;
    let pos = 0;           // corrimiento actual, 0..mitad
    let ritmo = 1;         // 1 = avanza, 0 = frenada
    const ritmoObj = { v: 1 };
    let arrastrando = false, ultimoX = 0, movido = 0, enVista = false;

    const medir = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      mitad = originales.reduce((acc, b) => acc + b.offsetWidth + gap, 0);
    };
    medir();
    window.addEventListener('resize', medir);

    const frenar = (a) => gsap.to(ritmoObj, { v: a, duration: a ? 0.8 : 0.45, ease: 'power2.out', overwrite: true, onUpdate: () => { ritmo = ritmoObj.v; } });

    gsap.ticker.add((t, dt) => {
      if (!enVista || !mitad) return;
      if (!arrastrando) pos += (VEL * ritmo * dt) / 1000;
      pos = ((pos % mitad) + mitad) % mitad;
      track.style.transform = `translate3d(${-pos}px, 0, 0)`;
    });

    ScrollTrigger.create({ trigger: zona, start: 'top bottom', end: 'bottom top', onToggle: (self) => { enVista = self.isActive; } });

    if (punteroFino) {
      zona.addEventListener('pointerenter', () => frenar(0));
      zona.addEventListener('pointerleave', () => { if (!arrastrando) frenar(1); });
    }
    zona.addEventListener('focusin', () => frenar(0));
    zona.addEventListener('focusout', () => frenar(1));

    zona.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      arrastrando = true; movido = 0; ultimoX = e.clientX;
      frenar(0);
    });
    window.addEventListener('pointermove', (e) => {
      if (!arrastrando) return;
      const dx = e.clientX - ultimoX;
      ultimoX = e.clientX;
      movido += Math.abs(dx);
      if (movido > 6) zona.classList.add('is-drag');
      pos -= dx;
    });
    window.addEventListener('pointerup', () => {
      if (!arrastrando) return;
      arrastrando = false;
      marcarArrastre();
      zona.classList.remove('is-drag');
      // en táctil no hay hover: retoma sola después de un momento
      if (!punteroFino || !zona.matches(':hover')) gsap.delayedCall(punteroFino ? 0 : 1.2, () => frenar(1));
    });
    // si hubo arrastre, el click que viene después no abre el visor
    function marcarArrastre() {
      arrastroCinta = movido > 6;
      setTimeout(() => { arrastroCinta = false; }, 0);
    }
  }

  /* ------------------------------------------------------------------ *
   * Proceso: el hilo se dibuja y los pasos entran de costado
   * ------------------------------------------------------------------ */
  if (!quieto) {
    gsap.fromTo('#hilo', { strokeDashoffset: 1 }, {
      strokeDashoffset: 0, ease: 'none',
      scrollTrigger: { trigger: '#proc', start: 'top 70%', end: 'bottom 70%', scrub: true },
    });
    $$('.step-p').forEach((s) => {
      const izq = s.dataset.side === 'l';
      gsap.from(s, {
        x: izq ? -120 : 120, rotation: izq ? -8 : 8, opacity: 0, duration: 1.1, ease: 'expo.out',
        scrollTrigger: { trigger: s, start: 'top 82%', once: true },
      });
      gsap.from($('.step-n', s), { yPercent: 100, opacity: 0, duration: 0.8, delay: 0.2, ease: 'back.out(2)', scrollTrigger: { trigger: s, start: 'top 82%', once: true } });
    });
  }

  /* ------------------------------------------------------------------ *
   * Planes: las hojas caen sobre la mesa
   * ------------------------------------------------------------------ */
  if (!quieto) {
    gsap.from('.plan', {
      y: -420, rotation: () => gsap.utils.random(-22, 22), opacity: 0,
      duration: 1.15, ease: 'bounce.out', stagger: 0.16,
      scrollTrigger: { trigger: '#plans', start: 'top 78%', once: true },
    });
  }

  /* ------------------------------------------------------------------ *
   * Preguntas: se despliegan con altura animada
   * ------------------------------------------------------------------ */
  $$('.faq details').forEach((det) => {
    const sum = $('summary', det);
    const cont = $('.faq-a', det);
    sum.addEventListener('click', (e) => {
      if (quieto) return;
      e.preventDefault();
      if (det.open) {
        gsap.to(cont, { height: 0, opacity: 0, duration: 0.4, ease: 'power2.inOut', onComplete: () => { det.open = false; gsap.set(cont, { clearProps: 'height,opacity' }); } });
      } else {
        det.open = true;
        gsap.from(cont, { height: 0, opacity: 0, duration: 0.55, ease: 'expo.out', clearProps: 'height,opacity' });
      }
    });
  });
  if (!quieto) {
    gsap.from('.faq details', { y: 30, opacity: 0, stagger: 0.07, duration: 0.8, ease: 'expo.out', scrollTrigger: { trigger: '#faq', start: 'top 85%', once: true } });
  }

  /* ------------------------------------------------------------------ *
   * Cierre: «Hablemos.» entra letra por letra y se deforma con la velocidad
   * ------------------------------------------------------------------ */
  if (!quieto) {
    const fin = $('#endT');
    const sp = partir($('.w', fin), 'chars');
    if (sp) {
      gsap.from(sp.chars, {
        yPercent: 120, rotation: 10, stagger: 0.04, duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: fin, start: 'top 88%', once: true },
      });
    }
    const sesgo = gsap.quickTo(fin, 'skewX', { duration: 0.6, ease: 'power3' });
    const estira = gsap.quickTo(fin, 'scaleY', { duration: 0.6, ease: 'power3' });
    ScrollTrigger.create({
      trigger: '.s-end', start: 'top bottom', end: 'bottom bottom',
      onUpdate: (self) => {
        const v = self.getVelocity();
        sesgo(gsap.utils.clamp(-14, 14, v / -150));
        estira(1 + gsap.utils.clamp(0, 0.18, Math.abs(v) / 9000));
        gsap.delayedCall(0.15, () => { sesgo(0); estira(1); });
      },
    });
    gsap.from('.s-end-fig img', { y: 140, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.s-end-fig', start: 'top 85%', once: true } });
    gsap.from('.s-end-fig .stage-disc', { scale: 0, duration: 1.4, ease: 'elastic.out(1, .7)', scrollTrigger: { trigger: '.s-end-fig', start: 'top 85%', once: true } });
  }

  /* ------------------------------------------------------------------ *
   * Las medidas cambian cuando cargan las tipografías
   * ------------------------------------------------------------------ */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
