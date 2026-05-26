/* ========================================================
   CYBERSEC — IMMERSIVE INTERACTIVE EXPERIENCE
   ======================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // ===================================================
    //  LOADING SCREEN
    // ===================================================
    const loader = document.getElementById('loader');
    const loaderFill = document.getElementById('loader-fill');
    let progress = 0;

    const loaderInterval = setInterval(() => {
        progress += Math.random() * 25 + 10;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loaderInterval);
            setTimeout(() => {
                loader.classList.add('hidden');
                document.body.style.overflow = '';
                triggerHeroAnimations();
            }, 400);
        }
        loaderFill.style.width = progress + '%';
    }, 200);

    document.body.style.overflow = 'hidden';

    // ===================================================
    //  CUSTOM CURSOR
    // ===================================================
    const cursor = document.getElementById('cursor');
    const trail = document.getElementById('cursor-trail');
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;
    let trailX = 0, trailY = 0;

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice) {
        document.body.classList.add('no-custom-cursor');
        cursor.style.display = 'none';
        trail.style.display = 'none';
    } else {
        document.addEventListener('mousemove', e => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        // Hover detection
        const interactives = 'a, button, input, .demo-xss-chip, .demo-exec-chip, .demo-sqli-chip, .demo-lfi-link, .demo-btn-reveal, .demo-switch, .magnetic';

        document.addEventListener('mouseover', e => {
            if (e.target.closest(interactives)) {
                cursor.classList.add('hover');
                trail.classList.add('hover');
            }
        });

        document.addEventListener('mouseout', e => {
            if (e.target.closest(interactives)) {
                cursor.classList.remove('hover');
                trail.classList.remove('hover');
            }
        });

        // Smooth cursor animation
        function animateCursor() {
            cursorX += (mouseX - cursorX) * 0.2;
            cursorY += (mouseY - cursorY) * 0.2;
            trailX += (mouseX - trailX) * 0.08;
            trailY += (mouseY - trailY) * 0.08;

            cursor.style.transform = `translate(${cursorX - 6}px, ${cursorY - 6}px)`;
            trail.style.transform = `translate(${trailX - 18}px, ${trailY - 18}px)`;

            requestAnimationFrame(animateCursor);
        }
        animateCursor();
    }

    // ===================================================
    //  MAGNETIC EFFECT
    // ===================================================
    document.querySelectorAll('.magnetic').forEach(el => {
        el.addEventListener('mousemove', e => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            el.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });

        el.addEventListener('mouseleave', () => {
            el.style.transform = '';
        });
    });

    // ===================================================
    //  PARTICLES BACKGROUND
    // ===================================================
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 1.8 + 0.4;
            this.speedX = (Math.random() - 0.5) * 0.3;
            this.speedY = (Math.random() - 0.5) * 0.3;
            this.opacity = Math.random() * 0.4 + 0.05;
            const colors = ['139,92,246', '34,211,238', '249,115,22', '250,204,21'];
            this.color = colors[Math.floor(Math.random() * colors.length)];
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            // Mouse repulsion
            if (!isTouchDevice) {
                const dx = mouseX - this.x;
                const dy = mouseY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    const force = (100 - dist) / 100;
                    this.x -= (dx / dist) * force * 1.2;
                    this.y -= (dy / dist) * force * 1.2;
                }
            }

            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color}, ${this.opacity})`;
            ctx.fill();
        }
    }

    function initParticles() {
        const count = Math.min(60, Math.floor((canvas.width * canvas.height) / 20000));
        particles = [];
        for (let i = 0; i < count; i++) particles.push(new Particle());
    }

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 130) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(139,92,246,${(1 - dist / 130) * 0.12})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        drawConnections();
        requestAnimationFrame(animateParticles);
    }

    initParticles();
    animateParticles();

    // ===================================================
    //  SCROLL PROGRESS BAR
    // ===================================================
    const scrollProgress = document.getElementById('scroll-progress');

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const percent = (scrollTop / docHeight) * 100;
        scrollProgress.style.width = percent + '%';
    });

    // ===================================================
    //  NAVIGATION
    // ===================================================
    const nav = document.getElementById('main-nav');
    const burger = document.getElementById('nav-burger');
    const mobileMenu = document.getElementById('nav-mobile');
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 60) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }

        // Active section
        let current = '';
        sections.forEach(s => {
            const rect = s.getBoundingClientRect();
            if (rect.top <= 250 && rect.bottom > 250) {
                current = s.getAttribute('data-accent');
            }
        });

        navLinks.forEach(l => {
            l.classList.remove('active');
            if (l.getAttribute('data-section') === current) l.classList.add('active');
        });
    });

    burger.addEventListener('click', () => {
        burger.classList.toggle('open');
        mobileMenu.classList.toggle('open');
    });

    document.querySelectorAll('.nav-mobile-link').forEach(l => {
        l.addEventListener('click', () => {
            burger.classList.remove('open');
            mobileMenu.classList.remove('open');
        });
    });

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            const target = document.querySelector(a.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // ===================================================
    //  SCROLL REVEAL ANIMATIONS
    // ===================================================
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { rootMargin: '0px 0px -60px 0px', threshold: 0.08 });

    document.querySelectorAll('.reveal-up').forEach(el => revealObserver.observe(el));

    // Section glow in-view
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
            }
        });
    }, { threshold: 0.1 });

    sections.forEach(s => sectionObserver.observe(s));

    // ===================================================
    //  HERO ANIMATIONS
    // ===================================================
    function triggerHeroAnimations() {
        document.querySelectorAll('#hero .reveal-up').forEach(el => {
            el.classList.add('visible');
        });
        animateCounters();
    }

    // Counter animation
    function animateCounters() {
        document.querySelectorAll('.counter-num').forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'));
            const duration = 1800;
            const start = performance.now();

            function update(now) {
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 4);
                counter.textContent = Math.round(eased * target);
                if (progress < 1) requestAnimationFrame(update);
            }

            requestAnimationFrame(update);
        });
    }

    // ===================================================
    //  INTERACTIVE DEMOS
    // ===================================================

    // ---- CLICKJACKING DEMO ----
    const btnFake = document.getElementById('btn-fake-action');
    const overlay = document.getElementById('clickjack-overlay');
    const clickResult = document.getElementById('clickjack-result');
    const clickReset = document.getElementById('clickjack-reset');

    if (btnFake) {
        btnFake.addEventListener('click', () => {
            // Reveal the trap
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            clickResult.innerHTML = '🚨 Piégé ! Vous pensiez cliquer sur « Gagner un cadeau » mais en réalité, vous avez cliqué sur « Transférer 500€ » ! Le bouton vert cachait le bouton rouge.';
            clickResult.className = 'demo-result danger-result';
            clickReset.style.display = 'block';
        });

        clickReset.addEventListener('click', () => {
            overlay.style.opacity = '';
            overlay.style.pointerEvents = '';
            clickResult.innerHTML = '';
            clickResult.className = 'demo-result';
            clickReset.style.display = 'none';
        });
    }

    // ---- SOURCE CODE DEMO ----
    const btnInspect = document.getElementById('btn-inspect');
    const sourceReveal = document.getElementById('source-reveal');

    if (btnInspect) {
        btnInspect.addEventListener('click', () => {
            sourceReveal.style.display = 'block';
            btnInspect.textContent = '😱 Oh non, des secrets !';
            btnInspect.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
        });
    }

    // ---- XSS DEMO ----
    const xssInput = document.getElementById('xss-input');
    const xssSend = document.getElementById('xss-send');
    const xssBoard = document.getElementById('xss-board');
    const xssWarning = document.getElementById('xss-warning');
    const xssReset = document.getElementById('xss-reset');

    // Chip suggestions
    document.querySelectorAll('.demo-xss-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            xssInput.value = chip.getAttribute('data-value');
            xssInput.focus();
        });
    });

    if (xssSend) {
        xssSend.addEventListener('click', () => {
            const val = xssInput.value.trim();
            if (!val) return;

            const msg = document.createElement('div');
            msg.className = 'demo-xss-msg';

            const hasHTML = /<[^>]+>/.test(val);

            if (hasHTML) {
                msg.classList.add('injected');
                msg.innerHTML = `<strong>Vous :</strong> ${val}`;
                xssWarning.style.display = 'block';

                // Intercept alert for XSS demo
                const originalAlert = window.alert;
                window.alert = function(text) {
                    xssWarning.innerHTML = `🚨 ALERTE ! Le code a tenté d'exécuter : <code>alert('${text}')</code> — Sur un vrai site, vos cookies auraient pu être volés !`;
                    window.alert = originalAlert;
                };
            } else {
                msg.classList.add('safe');
                msg.innerHTML = `<strong>Vous :</strong> ${escapeHTML(val)}`;
            }

            xssBoard.appendChild(msg);
            xssInput.value = '';
            xssReset.style.display = 'block';

            // Scroll board to bottom
            xssBoard.scrollTop = xssBoard.scrollHeight;
        });

        xssInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') xssSend.click();
        });

        xssReset.addEventListener('click', () => {
            xssBoard.innerHTML = '<div class="demo-xss-msg safe"><strong>Marie :</strong> Super site, bravo ! 👍</div>';
            xssWarning.style.display = 'none';
            xssInput.value = '';
            xssReset.style.display = 'none';
        });
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ---- VALIDATION DEMO ----
    const validAge = document.getElementById('valid-age');
    const validSubmit = document.getElementById('valid-submit');
    const validResult = document.getElementById('valid-result');
    const validToggle = document.getElementById('valid-toggle');
    const validToggleInfo = document.getElementById('valid-toggle-info');

    if (validToggle) {
        validToggle.addEventListener('change', () => {
            if (validToggle.checked) {
                validToggleInfo.innerHTML = 'Le vigile JavaScript est <strong>actif</strong>. Il bloque les mineurs.';
            } else {
                validToggleInfo.innerHTML = '⚠️ Le vigile JavaScript est <strong style="color:#fca5a5">désactivé</strong>. N\'importe qui peut passer !';
            }
            validResult.innerHTML = '';
            validResult.className = 'demo-valid-result';
        });
    }

    if (validSubmit) {
        validSubmit.addEventListener('click', () => {
            const age = parseInt(validAge.value);
            const jsActive = validToggle.checked;

            if (jsActive && age < 18) {
                validResult.textContent = '🚫 Accès refusé ! Vous avez moins de 18 ans.';
                validResult.className = 'demo-valid-result blocked';
                shakeElement(validSubmit);
            } else if (!jsActive && age < 18) {
                validResult.textContent = '💀 Accès autorisé ! Le pirate a contourné la vérification en désactivant JavaScript. Sans contrôle serveur, n\'importe qui peut entrer.';
                validResult.className = 'demo-valid-result hacked';
            } else {
                validResult.textContent = '✅ Bienvenue ! Accès autorisé.';
                validResult.className = 'demo-valid-result passed';
            }
        });
    }

    function shakeElement(el) {
        el.style.animation = 'none';
        el.offsetHeight; // trigger reflow
        el.style.animation = 'shake 0.5s var(--ease)';
        setTimeout(() => { el.style.animation = ''; }, 500);
    }

    // Add shake keyframes dynamically
    const shakeStyle = document.createElement('style');
    shakeStyle.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20% { transform: translateX(-8px); }
            40% { transform: translateX(8px); }
            60% { transform: translateX(-4px); }
            80% { transform: translateX(4px); }
        }
    `;
    document.head.appendChild(shakeStyle);

    // ---- LFI DEMO ----
    const lfiLinks = document.querySelectorAll('.demo-lfi-link');
    const lfiUrl = document.getElementById('lfi-url');
    const lfiContent = document.getElementById('lfi-content');

    const lfiPages = {
        accueil: {
            html: '<h4>🏠 Bienvenue sur notre site !</h4><p>Nous sommes ravis de vous accueillir.</p>',
            hacked: false
        },
        contact: {
            html: '<h4>📧 Contactez-nous</h4><p>Email : contact@monsupersite.fr</p>',
            hacked: false
        },
        '../../../etc/passwd': {
            html: `<h4>💀 FICHIER SYSTÈME VOLÉ !</h4>
<pre>root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin
www-data:x:33:33:www-data:/var/www
mysql:x:27:27:MySQL Server:/var/lib/mysql
admin:x:1000:1000:Admin:/home/admin</pre>
<p style="color:#fca5a5;font-weight:600;margin-top:0.75rem">🚨 Le pirate a remonté les dossiers et lu le fichier des mots de passe du serveur !</p>`,
            hacked: true
        }
    };

    lfiLinks.forEach(link => {
        link.addEventListener('click', () => {
            const page = link.getAttribute('data-page');
            const data = lfiPages[page];
            if (!data) return;

            lfiLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            lfiUrl.innerHTML = `site.com/?page=<strong>${escapeHTML(page)}</strong>`;
            lfiContent.innerHTML = data.html;
            lfiContent.className = 'demo-lfi-content' + (data.hacked ? ' hacked' : '');

            // Animate content change
            lfiContent.style.opacity = '0';
            lfiContent.style.transform = 'translateY(10px)';
            requestAnimationFrame(() => {
                lfiContent.style.transition = 'opacity 0.4s, transform 0.4s';
                lfiContent.style.opacity = '1';
                lfiContent.style.transform = 'translateY(0)';
            });
        });
    });

    // ---- EXEC DEMO ----
    const execInput = document.getElementById('exec-input');
    const execSend = document.getElementById('exec-send');
    const execCmd = document.getElementById('exec-cmd');
    const execOutput = document.getElementById('exec-output');

    document.querySelectorAll('.demo-exec-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            execInput.value = chip.getAttribute('data-value');
            execInput.focus();
        });
    });

    if (execSend) {
        execSend.addEventListener('click', () => {
            const val = execInput.value.trim();
            if (!val) return;

            const hasAttack = val.includes(';') || val.includes('&&') || val.includes('|');

            execCmd.textContent = `ping -c 1 ${val}`;

            // Typing animation for terminal
            execCmd.style.opacity = '0';
            requestAnimationFrame(() => {
                execCmd.style.transition = 'opacity 0.3s';
                execCmd.style.opacity = '1';
            });

            if (hasAttack) {
                const parts = val.split(/[;&|]+/);
                const extraCmd = parts.slice(1).join(' ').trim();
                execOutput.innerHTML = `🚨 <strong>DANGER !</strong> Le serveur a exécuté DEUX commandes :<br>
                    1. <code>ping -c 1 ${escapeHTML(parts[0].trim())}</code> ← commande normale<br>
                    2. <code>${escapeHTML(extraCmd)}</code> ← commande du pirate !<br><br>
                    Le pirate peut maintenant lire tous les fichiers du serveur.`;
                execOutput.className = 'demo-exec-output danger-output';
            } else {
                execOutput.innerHTML = `✅ Commande normale exécutée : <code>ping -c 1 ${escapeHTML(val)}</code><br>Réponse : 64 bytes from ${escapeHTML(val)}: time=12.3ms`;
                execOutput.className = 'demo-exec-output safe-output';
            }
        });
    }

    // ---- SQL INJECTION DEMO ----
    const sqliLogin = document.getElementById('sqli-login');
    const sqliPwd = document.getElementById('sqli-pwd');
    const sqliSubmit = document.getElementById('sqli-submit');
    const sqliQuery = document.getElementById('sqli-query');
    const sqliResult = document.getElementById('sqli-result');

    document.querySelectorAll('.demo-sqli-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            sqliLogin.value = chip.getAttribute('data-login');
            sqliPwd.value = chip.getAttribute('data-pwd');
            sqliLogin.focus();
        });
    });

    if (sqliSubmit) {
        sqliSubmit.addEventListener('click', () => {
            const login = sqliLogin.value;
            const pwd = sqliPwd.value;

            const isInjection = login.includes("'") || login.includes('--') || login.includes('OR');

            if (isInjection) {
                sqliQuery.innerHTML = `SELECT * FROM users
WHERE login='<span class="sqli-hl injected">${escapeHTML(login)}</span>'
AND pwd='<span class="sqli-hl">${escapeHTML(pwd)}</span>'`;

                sqliQuery.className = 'demo-sqli-pre danger';

                // Highlight the trick
                sqliResult.innerHTML = `🚨 <strong>PIRATÉ !</strong> Le <code>admin' --</code> ferme le champ login et le <code>--</code> met le reste en commentaire. Le mot de passe n'est même pas vérifié ! Le pirate se connecte en tant qu'admin.`;
                sqliResult.className = 'demo-sqli-result success';
            } else {
                sqliQuery.innerHTML = `SELECT * FROM users
WHERE login='<span class="sqli-hl">${escapeHTML(login)}</span>'
AND pwd='<span class="sqli-hl">${escapeHTML(pwd)}</span>'`;

                sqliQuery.className = 'demo-sqli-pre safe';

                // Check "correct" password
                if (login === 'admin' && pwd === 'admin123') {
                    sqliResult.innerHTML = '✅ Connexion réussie (mot de passe correct).';
                    sqliResult.className = 'demo-sqli-result fail';
                } else {
                    sqliResult.innerHTML = '❌ Identifiant ou mot de passe incorrect.';
                    sqliResult.className = 'demo-sqli-result fail';
                }
            }
        });
    }

    // ---- PASSWORD DEMO ----
    const pwdReveal = document.getElementById('pwd-reveal');
    const pwdPlain1 = document.getElementById('pwd-plain-1');
    const pwdPlain2 = document.getElementById('pwd-plain-2');
    const pwdPlain3 = document.getElementById('pwd-plain-3');

    const passwords = ['admin123', 'azerty2024', 'lucas!456'];
    let pwdRevealed = false;

    if (pwdReveal) {
        pwdReveal.addEventListener('click', () => {
            pwdRevealed = !pwdRevealed;

            if (pwdRevealed) {
                [pwdPlain1, pwdPlain2, pwdPlain3].forEach((el, i) => {
                    el.textContent = passwords[i];
                    el.classList.add('revealed');
                });
                pwdReveal.textContent = '🙈 Cacher les mots de passe';
                pwdReveal.style.background = 'rgba(52,211,153,0.1)';
                pwdReveal.style.borderColor = 'rgba(52,211,153,0.2)';
                pwdReveal.style.color = '#6ee7b7';
            } else {
                [pwdPlain1, pwdPlain2, pwdPlain3].forEach(el => {
                    el.textContent = '●●●●●●●';
                    el.classList.remove('revealed');
                });
                pwdReveal.textContent = '👁️ Voir les mots de passe';
                pwdReveal.style.background = '';
                pwdReveal.style.borderColor = '';
                pwdReveal.style.color = '';
            }
        });
    }

    // ===================================================
    //  PARALLAX ON SCROLL (subtle)
    // ===================================================
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        // Hero parallax
        const hero = document.getElementById('hero');
        if (hero) {
            const heroInner = hero.querySelector('.hero-inner');
            if (heroInner && scrollY < window.innerHeight) {
                heroInner.style.transform = `translateY(${scrollY * 0.15}px)`;
                heroInner.style.opacity = 1 - (scrollY / (window.innerHeight * 0.8));
            }
        }

        // Scroll hint fade
        const scrollHint = document.querySelector('.hero-scroll-hint');
        if (scrollHint) {
            scrollHint.style.opacity = Math.max(0, 1 - scrollY / 200);
        }
    });

    // ===================================================
    //  CODE BLOCK GLOW ON HOVER
    // ===================================================
    document.querySelectorAll('.card-code').forEach(block => {
        block.addEventListener('mouseenter', () => {
            block.style.borderColor = 'rgba(139,92,246,0.2)';
            block.style.boxShadow = '0 0 30px rgba(139,92,246,0.04)';
        });
        block.addEventListener('mouseleave', () => {
            block.style.borderColor = '';
            block.style.boxShadow = '';
        });
    });

});
