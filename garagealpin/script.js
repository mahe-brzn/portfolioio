// ============================================================
// LE GARAGE ALPIN — JAVASCRIPT OPTIMISÉ MOBILE
// ============================================================

(function () {
  'use strict';

  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const isTouch  = !window.matchMedia('(hover: hover)').matches;

  /* ──────────────────────────────────────────────
     1. PRELOADER — plus court sur mobile
  ────────────────────────────────────────────── */
  const preloader  = document.getElementById('preloader');
  const preBar     = preloader?.querySelector('.pre-bar');
  const preCounter = preloader?.querySelector('.pre-counter');

  let progress = 0;
  // Mobile: 800ms, Desktop: 1800ms
  const duration = isMobile ? 800 : 1800;
  const interval = 30;
  const step = (100 / (duration / interval));

  const preloadTimer = setInterval(() => {
    progress = Math.min(progress + step * (0.5 + Math.random()), 100);
    const p = Math.floor(progress);
    if (preBar)     preBar.style.width = p + '%';
    if (preCounter) preCounter.textContent = p + '%';
    if (progress >= 100) {
      clearInterval(preloadTimer);
      setTimeout(() => {
        preloader?.classList.add('done');
        document.body.classList.remove('loading');
        initReveal();
      }, 200);
    }
  }, interval);

  /* ──────────────────────────────────────────────
     2. CUSTOM CURSOR — désactivé sur touch/mobile
  ────────────────────────────────────────────── */
  if (!isTouch) {
    const dot  = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');

    if (dot && ring) {
      let mx = -100, my = -100;
      let rx = -100, ry = -100;

      document.addEventListener('mousemove', e => {
        mx = e.clientX; my = e.clientY;
        dot.style.left = mx + 'px';
        dot.style.top  = my + 'px';
      });

      function lerpCursor() {
        rx += (mx - rx) * 0.08;
        ry += (my - ry) * 0.08;
        ring.style.left = rx + 'px';
        ring.style.top  = ry + 'px';
        requestAnimationFrame(lerpCursor);
      }
      lerpCursor();

      const hoverEls = document.querySelectorAll('a, button, .service-card, .team-card, .equipe-card, .mob-link, .btn-magnetic, .btn-outline');
      hoverEls.forEach(el => {
        el.addEventListener('mouseenter', () => ring.classList.add('hover'));
        el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
      });
      document.querySelectorAll('.tilt-card').forEach(card => {
        card.addEventListener('mouseenter', () => ring.classList.add('glow'));
        card.addEventListener('mouseleave', () => ring.classList.remove('glow'));
      });
      document.addEventListener('mousedown', () => ring.classList.add('click'));
      document.addEventListener('mouseup',   () => ring.classList.remove('click'));
      document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
      document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });
    }
  }

  /* ──────────────────────────────────────────────
     3. NAVBAR SCROLL STATE
  ────────────────────────────────────────────── */
  const header = document.querySelector('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  /* ──────────────────────────────────────────────
     4. MOBILE MENU
  ────────────────────────────────────────────── */
  const burger   = document.querySelector('.nav-burger');
  const mobMenu  = document.getElementById('mobile-menu');
  const mobLinks = document.querySelectorAll('.mob-link');

  function openMenu()  {
    mobMenu?.removeAttribute('hidden');
    burger?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    mobMenu?.setAttribute('hidden', '');
    burger?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  burger?.addEventListener('click', () => {
    const isOpen = burger.getAttribute('aria-expanded') === 'true';
    isOpen ? closeMenu() : openMenu();
  });
  mobLinks.forEach(l => l.addEventListener('click', closeMenu));

  /* ──────────────────────────────────────────────
     5. SCROLL REVEAL (Intersection Observer)
  ────────────────────────────────────────────── */
  function initReveal() {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0.1 });

    document.querySelectorAll('.reveal, .split-text').forEach(el => observer.observe(el));
  }
  window.initReveal = initReveal;

  /* ──────────────────────────────────────────────
     6. ANIMATED COUNTERS
  ────────────────────────────────────────────── */
  function animateCounter(el) {
    const end    = parseInt(el.getAttribute('data-target') || el.textContent);
    const suffix = el.getAttribute('data-suffix') || '';
    const dur    = 2000;
    let start    = null;
    function step(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / dur, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      el.textContent = Math.floor(ease * end) + suffix;
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  const counterObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { animateCounter(entry.target); obs.unobserve(entry.target); }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

  /* ──────────────────────────────────────────────
     7. HERO STAT COUNTERS
  ────────────────────────────────────────────── */
  document.querySelectorAll('.stat-num[data-count]').forEach(wrap => {
    const end    = parseInt(wrap.getAttribute('data-count'));
    const suffix = wrap.getAttribute('data-suffix') || '';
    const nEl    = wrap.querySelector('.n');
    if (!nEl) return;
    const obs = new IntersectionObserver(([entry], ob) => {
      if (!entry.isIntersecting) return;
      ob.disconnect();
      let start = null;
      function step(ts) {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 1800, 1);
        const e = 1 - Math.pow(1 - p, 4);
        nEl.textContent = Math.floor(e * end);
        if (p < 1) requestAnimationFrame(step);
        else nEl.textContent = end;
      }
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    obs.observe(wrap);
  });

  /* ──────────────────────────────────────────────
     8. SMOOTH SCROLL
  ────────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ──────────────────────────────────────────────
     9. HEAVY DESKTOP-ONLY FEATURES
     (canvas, tilt, mouse glow, magnetic buttons)
     Deferred via requestIdleCallback
  ────────────────────────────────────────────── */
  function initDesktopFeatures() {

    /* SERVICE CARD MOUSE GLOW */
    document.querySelectorAll('.service-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width  * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((e.clientY - rect.top)  / rect.height * 100).toFixed(1) + '%');
      });
    });

    /* MAGNETIC BUTTONS */
    document.querySelectorAll('.btn-magnetic').forEach(btn => {
      let isGrabbed = false, currX = 0, currY = 0;
      btn.addEventListener('mousedown', () => {
        isGrabbed = true;
        btn.style.transition = 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
        btn.style.transform = `translate(${currX}px, ${currY}px) scale(0.92)`;
      });
      btn.addEventListener('mouseup', () => {
        isGrabbed = false;
        btn.style.transform = `translate(${currX}px, ${currY}px) scale(1)`;
      });
      btn.addEventListener('mousemove', e => {
        const rect = btn.getBoundingClientRect();
        currX = (e.clientX - (rect.left + rect.width / 2)) * 0.3;
        currY = (e.clientY - (rect.top  + rect.height / 2)) * 0.3;
        btn.style.transition = 'transform 0.1s ease-out';
        btn.style.transform = `translate(${currX}px, ${currY}px) scale(${isGrabbed ? 0.92 : 1})`;
      });
      btn.addEventListener('mouseleave', () => {
        isGrabbed = false; currX = 0; currY = 0;
        btn.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        btn.style.transform = 'translate(0px, 0px) scale(1)';
      });
    });

    /* 3D TILT EFFECT */
    document.querySelectorAll('.tilt-card').forEach(card => {
      if (!card.querySelector('.tilt-glow')) {
        const glow = document.createElement('div');
        glow.className = 'tilt-glow';
        card.appendChild(glow);
      }
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const dx = x - rect.width / 2, dy = y - rect.height / 2;
        card.style.transition = 'none';
        card.style.transform = `perspective(1000px) rotateX(${-(dy / (rect.height/2)) * 15}deg) rotateY(${(dx / (rect.width/2)) * 15}deg) scale3d(1.02, 1.02, 1.02)`;
        card.style.setProperty('--gx', `${x}px`);
        card.style.setProperty('--gy', `${y}px`);
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        card.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      });
    });

    /* CANVAS PARTICLES — desktop only */
    const canvas = document.getElementById('hero-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      let W, H, particles = [];

      function resize() {
        W = canvas.width  = canvas.offsetWidth;
        H = canvas.height = canvas.offsetHeight;
      }
      resize();
      window.addEventListener('resize', resize, { passive: true });

      class Particle {
        constructor() { this.reset(); }
        reset() {
          this.x = Math.random() * W; this.y = Math.random() * H;
          this.vx = (Math.random() - 0.5) * 0.3; this.vy = (Math.random() - 0.5) * 0.3;
          this.r = Math.random() * 1.5 + 0.5; this.a = Math.random() * 0.4 + 0.05;
          this.isRed = Math.random() < 0.15;
        }
        update() {
          this.x += this.vx; this.y += this.vy;
          if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
        }
        draw() {
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
          ctx.fillStyle = this.isRed ? `rgba(227,0,15,${this.a})` : `rgba(255,255,255,${this.a})`;
          ctx.fill();
        }
      }
      // Fewer particles = lighter
      for (let i = 0; i < 60; i++) particles.push(new Particle());

      let rafId;
      function rafLoop() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => { p.update(); p.draw(); });
        rafId = requestAnimationFrame(rafLoop);
      }
      rafLoop();

      // Pause particles when tab is hidden (saves battery)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) cancelAnimationFrame(rafId);
        else rafLoop();
      });
    }
  }

  // Skip heavy desktop features on mobile entirely
  if (!isMobile && !isTouch) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(initDesktopFeatures, { timeout: 2000 });
    } else {
      setTimeout(initDesktopFeatures, 500);
    }
  }

})();
