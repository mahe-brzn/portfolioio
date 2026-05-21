'use strict';

/* ═══════════════════════════════════════════════════════════
   MAHÉ BRIZION — main.js v3
   Architecture modulaire · A11y-First · RAF-optimisé
═══════════════════════════════════════════════════════════ */

// ── 0. Feature Flags ────────────────────────────────────────
const PRM         = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_TOUCH    = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const IS_DESKTOP  = window.innerWidth > 900;

// ── Helpers ──────────────────────────────────────────────────
const $  = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

/* ═══════════════════════════════════════════════════════════
   1. PRELOADER
═══════════════════════════════════════════════════════════ */
(function initPreloader() {
  const preEl   = $('#preloader');
  const counter = $('.pre-counter');

  if (!preEl) return;

  // Reduced motion: skip immediately
  if (PRM) {
    preEl.remove();
    document.body.classList.remove('loading');
    launchHero({ instant: true });
    return;
  }

  // Animated counter 0 → 100
  let count = 0;
  const ticker = setInterval(() => {
    count = Math.min(count + Math.floor(Math.random() * 12) + 4, 100);
    if (counter) counter.textContent = count + '%';
    if (count >= 100) clearInterval(ticker);
  }, 60);

  function startTransition() {
    const heroName = $('.hero-name-wrap');
    if (!heroName) {
      preEl.remove();
      document.body.classList.remove('loading');
      launchHero({ instant: false });
      return;
    }

    // Add static-visible immediately so inner spans don't slide/fade
    $$('.hero-name-inner', heroName).forEach(el => el.classList.add('static-visible'));

    // 1. Get initial centered position/dimensions
    const firstRect = heroName.getBoundingClientRect();

    // 2. Hide preloader elements (bar & counter)
    document.body.classList.add('loading-done');

    // 3. Remove body loading class to move layout to final position
    document.body.classList.remove('loading');

    // 4. Get final layout position/dimensions
    const lastRect = heroName.getBoundingClientRect();

    // 4b. Lift element above preloader with fixed positioning for the transition duration
    heroName.classList.add('transitioning');
    heroName.style.top = lastRect.top + 'px';
    heroName.style.left = lastRect.left + 'px';
    heroName.style.width = lastRect.width + 'px';
    heroName.style.height = lastRect.height + 'px';

    // 5. Calculate translation distance and scale difference
    const dx = (firstRect.left + firstRect.width / 2) - (lastRect.left + lastRect.width / 2);
    const dy = (firstRect.top + firstRect.height / 2) - (lastRect.top + lastRect.height / 2);
    const dScale = 0.32;

    // 6. Invert: Apply transform to parent container to visually keep it centered and small
    heroName.style.transformOrigin = 'center center';
    heroName.style.transition = 'none';
    heroName.style.transform = `translate(${dx}px, ${dy}px) scale(${dScale})`;

    // Force repaint
    heroName.offsetHeight;

    // 7. Fade out the background preloader
    preEl.style.transition = 'opacity 1.8s cubic-bezier(0.85, 0, 0.15, 1)';
    preEl.classList.add('fade-out');

    // 8. Play: Smooth transition to the final layout (translate 0, scale 1)
    heroName.style.transition = 'transform 2.1s cubic-bezier(0.85, 0, 0.15, 1)';
    heroName.style.transform = 'translate(0, 0) scale(1)';

    // 9. Simultaneously animate other hero elements so they finish as the name lands
    launchHero({ instant: false, skipNameAnim: true });

      // 10. Clean up inline styles and remove preloader
      setTimeout(() => {
        heroName.classList.remove('transitioning');
        heroName.style.transition = '';
        heroName.style.transform = '';
        heroName.style.transformOrigin = '';
        heroName.style.top = '';
        heroName.style.left = '';
        heroName.style.width = '';
        heroName.style.height = '';
        preEl.remove();
      }, 2150);
    }



  const checkReady = setInterval(() => {
    if (count >= 100) {
      clearInterval(checkReady);
      setTimeout(startTransition, 100);
    }
  }, 30);
})();

/* ── Hero launch sequence ───────────────────────────────── */
function launchHero({ instant = false, skipNameAnim = false } = {}) {
  const nav = $('#nav');
  nav?.classList.add('visible');

  if (instant) {
    // Reduced motion: just show everything
    $$('.hero-name-inner').forEach(el => {
      el.style.opacity   = '1';
      el.style.transform = 'none';
    });
    const targets = ['.hero-line-wrap', '.hero-bottom', '.hero-scroll'];
    targets.forEach(s => {
      const el = $(s);
      if (el) { el.style.opacity = '1'; el.style.transform = 'none'; }
    });
    // Fire counters
    $$('[data-count]').forEach(el => animateCounter(el));
    return;
  }

  // Normal animated sequence for name, if not skipped
  if (!skipNameAnim) {
    $$('.hero-name-inner').forEach(el => el.classList.add('animate'));
  }

  setTimeout(() => {
    $('.hero-name-wrap')?.classList.add('sweep');
  }, 700);

  setTimeout(() => {
    $('.hero-line-wrap')?.classList.add('animate');
    $('.hero-bottom')?.classList.add('animate');
    $('.hero-scroll')?.classList.add('animate');
  }, 520);

  setTimeout(() => {
    $$('[data-count]').forEach(el => animateCounter(el));
  }, 920);
}

/* ═══════════════════════════════════════════════════════════
   2. CUSTOM CURSOR (pointer devices only)
═══════════════════════════════════════════════════════════ */
(function initCursor() {
  // Bail on touch or reduced motion
  if (IS_TOUCH || PRM) return;

  const dot  = $('#cursor-dot');
  const ring = $('#cursor-ring');
  if (!dot || !ring) return;

  let cx = -100, cy = -100; // dot (immediate)
  let rx = -100, ry = -100; // ring (lagged)
  let lastX = 0, lastY = 0;
  let lastTime = performance.now();
  let mouseSpeed = 0;
  let scaleVal = 1;
  let rafId;

  // Dot follows mouse exactly + track speed
  window.addEventListener('mousemove', e => {
    cx = e.clientX;
    cy = e.clientY;
    dot.style.left = cx + 'px';
    dot.style.top  = cy + 'px';

    const now = performance.now();
    if (lastX === 0 && lastY === 0) {
      lastX = cx;
      lastY = cy;
      lastTime = now;
      return;
    }

    const dt = now - lastTime;
    if (dt > 0) {
      const dx = cx - lastX;
      const dy = cy - lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const instantSpeed = dist / dt; // pixels per ms
      // Low-pass filter for smooth speed changes
      mouseSpeed += (instantSpeed - mouseSpeed) * 0.2;
    }
    lastX = cx;
    lastY = cy;
    lastTime = now;
  }, { passive: true });

  // Ring follows with lerp + dynamic scaling based on speed
  function ringFollow() {
    rx += (cx - rx) * 0.13;
    ry += (cy - ry) * 0.13;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';

    // Decelerate speed when movement stops
    mouseSpeed *= 0.94;
    if (mouseSpeed < 0.01) mouseSpeed = 0;

    // Calculate scale factor: expand up to 2.8x (scale = 2.8)
    const threshold = 0.3; // speed threshold before scaling starts
    const maxScaleIncrease = 1.8;
    const speedFactor = Math.min(Math.max(0, mouseSpeed - threshold) * 0.45, maxScaleIncrease);
    const targetScale = 1 + speedFactor;

    // Smoothly interpolate the scale to prevent stepping
    scaleVal += (targetScale - scaleVal) * 0.12;

    // Apply translation + scale transform
    ring.style.transform = `translate(-50%, -50%) scale(${scaleVal.toFixed(3)})`;

    rafId = requestAnimationFrame(ringFollow);
  }
  rafId = requestAnimationFrame(ringFollow);

  // Hover state on interactive elements
  const interactives = $$('a, button, .project-row, .domain, .btn-magnetic');
  interactives.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });

  // Click state
  document.addEventListener('mousedown', () => document.body.classList.add('cursor-click'));
  document.addEventListener('mouseup',   () => document.body.classList.remove('cursor-click'));

  // Instant hide when mouse leaves window
  document.addEventListener('mouseleave', () => {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    dot.style.opacity  = '1';
    ring.style.opacity = '1';
    lastX = 0;
    lastY = 0;
  });
})();

/* ═══════════════════════════════════════════════════════════
   3. CURSOR GLOW (ambient, desktop only)
═══════════════════════════════════════════════════════════ */
(function initCursorGlow() {
  if (!IS_DESKTOP || IS_TOUCH || PRM) return;

  const glow = Object.assign(document.createElement('div'), {});
  Object.assign(glow.style, {
    position: 'fixed', inset: '0',
    pointerEvents: 'none', zIndex: '1',
  });

  const inner = document.createElement('div');
  Object.assign(inner.style, {
    position: 'absolute',
    width: '520px', height: '520px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(200,255,87,.032) 0%, transparent 70%)',
    transform: 'translate(-50%,-50%)',
    transition: 'left .35s ease, top .35s ease',
    pointerEvents: 'none',
  });

  glow.appendChild(inner);
  document.body.appendChild(glow);

  window.addEventListener('mousemove', e => {
    inner.style.left = e.clientX + 'px';
    inner.style.top  = e.clientY + 'px';
  }, { passive: true });
})();

/* ═══════════════════════════════════════════════════════════
   4. MAGNETIC BUTTON
═══════════════════════════════════════════════════════════ */
(function initMagnetic() {
  if (IS_TOUCH || PRM) return;

  $$('.btn-magnetic').forEach(btn => {
    let targetX = 0, targetY = 0;
    let curX = 0, curY = 0;
    let rafId = null;
    let isHovering = false;

    function lerp() {
      curX += (targetX - curX) * 0.12;
      curY += (targetY - curY) * 0.12;
      btn.style.transform = `translate(${curX}px, ${curY}px)`;
      
      if (!isHovering && Math.abs(curX) < 0.1 && Math.abs(curY) < 0.1) {
        btn.style.transform = '';
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(lerp);
    }

    btn.addEventListener('mouseenter', () => {
      isHovering = true;
      if (!rafId) rafId = requestAnimationFrame(lerp);
    });

    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      // Calculate true center by subtracting current transform
      const cx = r.left - curX + r.width / 2;
      const cy = r.top - curY + r.height / 2;
      targetX = (e.clientX - cx) * 0.26;
      targetY = (e.clientY - cy) * 0.34;
    });

    btn.addEventListener('mouseleave', () => {
      isHovering = false;
      targetX = 0;
      targetY = 0;
    });
  });
})();

/* ═══════════════════════════════════════════════════════════
   5. ORB MOUSE PARALLAX (RAF — hero only)
═══════════════════════════════════════════════════════════ */
(function initOrbParallax() {
  if (PRM || IS_TOUCH || !IS_DESKTOP) return;

  const orb1 = $('.amb-1');
  const orb2 = $('.amb-2');
  if (!orb1 || !orb2) return;

  let targetX = 0, targetY = 0;
  let curX    = 0, curY    = 0;
  let rafId   = null;
  let active  = false;

  window.addEventListener('mousemove', e => {
    // Normalize to -1 … +1 from center
    targetX = (e.clientX / window.innerWidth  - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function tick() {
    if (!active) return;
    // Smooth lerp (5% per frame → ~60fps feels natural)
    curX += (targetX - curX) * 0.05;
    curY += (targetY - curY) * 0.05;

    // Subtle movement: ±24px on orb1, ±16px on orb2 (counter-direction)
    orb1.style.transform = `translate(${curX * 24}px, ${curY * 18}px)`;
    orb2.style.transform = `translate(${-curX * 16}px, ${-curY * 12}px)`;

    rafId = requestAnimationFrame(tick);
  }

  // Only run RAF when hero is in viewport
  const heroEl = $('#hero');
  if (!heroEl) return;

  const obs = new IntersectionObserver(entries => {
    active = entries[0].isIntersecting;
    if (active && !rafId) {
      rafId = requestAnimationFrame(tick);
    } else if (!active) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });
  obs.observe(heroEl);
})();

/* ═══════════════════════════════════════════════════════════
   6. COUNTER ANIMATION
═══════════════════════════════════════════════════════════ */
function animateCounter(el) {
  const target   = parseInt(el.dataset.count, 10);
  const duration = PRM ? 0 : 1450;
  const start    = performance.now();

  function frame(now) {
    const p    = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 4); // quartic ease-out
    const val  = Math.floor(ease * target);

    const numEl = el.querySelector('.n');
    if (numEl) numEl.textContent = val;
    else el.textContent = val + (el.dataset.suffix || '');

    if (p < 1) requestAnimationFrame(frame);
  }

  duration === 0
    ? (() => { const n = el.querySelector('.n'); n ? n.textContent = target : el.textContent = target + (el.dataset.suffix||''); })()
    : requestAnimationFrame(frame);
}

/* ═══════════════════════════════════════════════════════════
   7. SCROLL REVEAL
═══════════════════════════════════════════════════════════ */
(function initReveal() {
  const els = $$('.reveal');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('on');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -48px 0px' });

  els.forEach(el => obs.observe(el));
})();

/* ═══════════════════════════════════════════════════════════
   8. PROJECT ROWS — staggered reveal
═══════════════════════════════════════════════════════════ */
(function initProjectRows() {
  const rows = $$('.project-row');
  const delay = PRM ? 0 : 90; // no stagger with reduced motion

  rows.forEach(row => {
    row.style.opacity    = '0';
    row.style.transform  = PRM ? 'none' : 'translateY(26px)';
    row.style.transition = `opacity .8s cubic-bezier(0.16,1,0.3,1),
                             transform .8s cubic-bezier(0.16,1,0.3,1)`;
  });

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const i = rows.indexOf(e.target);
        setTimeout(() => {
          e.target.style.opacity   = '1';
          e.target.style.transform = 'none';
        }, i * delay);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.05 });

  rows.forEach(r => obs.observe(r));
})();

/* ═══════════════════════════════════════════════════════════
   9. DOMAIN CELLS — staggered reveal
═══════════════════════════════════════════════════════════ */
(function initDomains() {
  const cells = $$('.domain');
  const delay = PRM ? 0 : 70;

  cells.forEach(c => {
    c.style.opacity    = '0';
    c.style.transform  = PRM ? 'none' : 'translateY(22px)';
    c.style.transition = `opacity .7s cubic-bezier(0.16,1,0.3,1),
                           transform .7s cubic-bezier(0.16,1,0.3,1),
                           background .3s`;
  });

  const grid = $('.domains');
  if (!grid) return;

  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      cells.forEach((c, i) => {
        setTimeout(() => {
          c.style.opacity   = '1';
          c.style.transform = 'none';
        }, i * delay);
      });
      obs.disconnect();
    }
  }, { threshold: 0.12 });

  obs.observe(grid);
})();

/* ═══════════════════════════════════════════════════════════
   10. CTA — word split reveal
═══════════════════════════════════════════════════════════ */
(function initCtaSplit() {
  const title = $('.cta-title');
  if (!title) return;

  // Wrap each word in overflow:hidden + animated inner span
  const words = title.textContent.trim().split(' ');
  title.innerHTML = words.map((w, i) => {
    const delay = PRM ? 0 : i * 130;
    return `<span style="display:inline-block;overflow:hidden;vertical-align:bottom;line-height:1;">`
      + `<span class="cw" style="display:inline-block;transform:${PRM ? 'none' : 'translateY(110%)'};opacity:${PRM ? 1 : 0};`
      + `transition:transform .9s cubic-bezier(0.16,1,0.3,1) ${delay}ms,opacity .9s ease ${delay}ms;">`
      + `${w}</span></span>${i < words.length - 1 ? ' ' : ''}`;
  }).join('');

  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      $$('.cw').forEach(w => {
        w.style.transform = 'translateY(0)';
        w.style.opacity   = '1';
      });
      obs.disconnect();
    }
  }, { threshold: 0.3 });

  obs.observe(title);
})();

/* ═══════════════════════════════════════════════════════════
   11. SMART STICKY NAV
   - Sticks + blurs after 60px
   - Hides on scroll-down, reveals on scroll-up
   - Uses RAF for batched reads
═══════════════════════════════════════════════════════════ */
(function initSmartNav() {
  const nav = $('#nav');
  if (!nav) return;

  let lastY   = 0;
  let ticking = false;

  window.addEventListener('scroll', () => {
    if (ticking) return;
    requestAnimationFrame(() => {
      const y = window.scrollY;

      // Stuck state (glassmorphism)
      nav.classList.toggle('stuck', y > 20);
      ticking = false;
    });
    ticking = true;
  }, { passive: true });
})();

/* ═══════════════════════════════════════════════════════════
   12. SCROLLSPY — nav links + aria-current
═══════════════════════════════════════════════════════════ */
(function initScrollspy() {
  // Collect all desktop nav links + mobile links
  const allNavLinks = $$('.nav-links a, .mob-link');
  const sections    = $$('section[id]');

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;

      allNavLinks.forEach(link => {
        const matches = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('on', matches);
        // aria-current: true for current section, remove otherwise
        if (matches) link.setAttribute('aria-current', 'true');
        else         link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-42% 0px -42% 0px', threshold: 0 });

  sections.forEach(s => obs.observe(s));
})();

/* ═══════════════════════════════════════════════════════════
   13. MOBILE OFF-CANVAS MENU + FOCUS TRAP
═══════════════════════════════════════════════════════════ */
(function initMobileMenu() {
  const burger  = $('.nav-burger');
  const menu    = $('#mobile-menu');
  if (!burger || !menu) return;

  let isOpen        = false;
  let prevFocus     = null;
  let trapHandler   = null;

  /* ── Focus Trap ─────────────────────────────────── */
  function getFocusable() {
    return [...menu.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter(el => !el.closest('[hidden]'));
  }

  function createTrap() {
    return function onKeydown(e) {
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (!focusable.length) return;

      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
  }

  /* ── Open ───────────────────────────────────────── */
  function openMenu() {
    isOpen    = true;
    prevFocus = document.activeElement;

    menu.removeAttribute('hidden');
    // Allow CSS to see the element before toggling class
    requestAnimationFrame(() => menu.classList.add('is-open'));

    burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');

    // Focus close button after animation starts
    setTimeout(() => $('.mob-close', menu)?.focus(), 120);

    // Attach trap
    trapHandler = createTrap();
    menu.addEventListener('keydown', trapHandler);
  }

  /* ── Close ──────────────────────────────────────── */
  function closeMenu() {
    isOpen = false;
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');

    // Remove trap
    if (trapHandler) {
      menu.removeEventListener('keydown', trapHandler);
      trapHandler = null;
    }

    // Hide after transition completes
    setTimeout(() => {
      menu.setAttribute('hidden', '');
      prevFocus?.focus(); // return focus to trigger
    }, 650);
  }

  /* ── Bindings ───────────────────────────────────── */
  burger.addEventListener('click', () => isOpen ? closeMenu() : openMenu());
  $('.mob-close', menu)?.addEventListener('click', closeMenu);

  // Close on any menu link click
  $$('.mob-link', menu).forEach(a => a.addEventListener('click', closeMenu));

  // Escape key closes menu
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) closeMenu();
  });

  // Backdrop click (if user taps outside on desktop view)
  menu.addEventListener('click', e => {
    if (e.target === menu) closeMenu();
  });
})();

/* ═══════════════════════════════════════════════════════════
   14. HERO SCROLL PARALLAX (name fade on scroll)
═══════════════════════════════════════════════════════════ */
(function initHeroParallax() {
  if (PRM || !IS_DESKTOP) return;

  const nameWrap = $('.hero-name-wrap');
  if (!nameWrap) return;

  let ticking = false;
  const vh    = window.innerHeight;

  window.addEventListener('scroll', () => {
    if (ticking) return;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (y < vh) {
        const p = y / vh;
        nameWrap.style.transform = `translateY(${p * 55}px)`;
        nameWrap.style.opacity   = `${Math.max(0, 1 - p * 1.3)}`;
      }
      ticking = false;
    });
    ticking = true;
  }, { passive: true });
})();

/* ═══════════════════════════════════════════════════════════
   15. SMOOTH ANCHOR SCROLL
═══════════════════════════════════════════════════════════ */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = $(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: PRM ? 'auto' : 'smooth' });
    });
  });
})();
