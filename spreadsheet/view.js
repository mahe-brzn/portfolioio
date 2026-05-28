(async function() {
  const supabase = window.supabaseClient;
  if (!supabase) return;

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const slug = pathParts[pathParts.length - 1]; // e.g. "mon-lien"

  try {
    const { data: spreadsheet, error } = await supabase
      .from('spreadsheets')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !spreadsheet) {
      // Show normal 404
      document.getElementById('main-content').style.display = 'flex';
      return;
    }

    renderSpreadsheet(spreadsheet);

  } catch (e) {
    document.getElementById('main-content').style.display = 'flex';
  }
})();

function renderSpreadsheet(spreadsheet) {
  // Add Garage Alpin styles if not present
  if (!document.querySelector('link[href="/garagealpin/style.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/garagealpin/style.css';
    document.head.appendChild(link);
  }

  // Create style overrides
  const style = document.createElement('style');
  style.innerHTML = `
    :root {
      --sneaker-accent: #00e5ff;
      --sneaker-dim: rgba(0, 229, 255, 0.15);
      --sneaker-glow: rgba(0, 229, 255, 0.4);
    }
    body { overflow-y: auto !important; }
    .nav-logo span, .link-num, .s-label::before { color: var(--sneaker-accent) !important; }
    
    .spreadsheet-hero {
      position: relative;
      padding: clamp(100px, 15vw, 160px) clamp(24px, 5vw, 80px) clamp(60px, 8vw, 80px);
      text-align: center;
      min-height: 40vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 2;
    }
    .spreadsheet-title {
      font-family: var(--font-display);
      font-size: clamp(3.5rem, 9vw, 6.5rem);
      font-weight: 800;
      line-height: 1.05;
      letter-spacing: -0.04em;
      margin-bottom: 24px;
      color: var(--white);
    }
    .spreadsheet-title .accent { color: var(--sneaker-accent); }
    .shoes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 32px;
      padding: 0 clamp(24px, 5vw, 80px) clamp(100px, 10vw, 160px);
      max-width: 1400px;
      margin: 0 auto;
      position: relative;
      z-index: 2;
    }
    .sneaker-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 24px;
      padding: 40px 32px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 300px;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s, border-color 0.4s;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    .sneaker-card::before {
      content: "";
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: radial-gradient(circle at top right, var(--sneaker-dim), transparent 60%);
      opacity: 0;
      transition: opacity 0.4s;
      pointer-events: none;
      z-index: 0;
    }
    .sneaker-card:hover {
      transform: translateY(-12px);
      border-color: rgba(0, 229, 255, 0.3);
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 229, 255, 0.05);
      background: rgba(255, 255, 255, 0.04);
    }
    .sneaker-card:hover::before { opacity: 1; }
    .sneaker-watermark {
      position: absolute;
      right: -10px;
      bottom: -15px;
      font-family: var(--font-display);
      font-size: 8rem;
      font-weight: 800;
      color: rgba(255, 255, 255, 0.02);
      line-height: 1;
      z-index: 0;
      pointer-events: none;
      transition: color 0.5s, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .sneaker-card:hover .sneaker-watermark {
      color: rgba(0, 229, 255, 0.05);
      transform: scale(1.05) translate(-10px, -5px);
    }
    .sneaker-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .sneaker-title {
      font-family: var(--font-display);
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--white);
      margin-bottom: 8px;
      line-height: 1.15;
      letter-spacing: -0.02em;
    }
    .sneaker-price {
      font-family: var(--font-body);
      font-size: 2rem;
      font-weight: 600;
      color: var(--sneaker-accent);
      margin-bottom: auto;
      padding-bottom: 40px;
    }
    .sneaker-btn {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      padding: 16px 32px;
      background: var(--sneaker-accent);
      color: #000;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-radius: 100px;
      text-decoration: none;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      align-self: flex-start;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    }
    .sneaker-btn:hover {
      box-shadow: 0 15px 30px var(--sneaker-glow);
      transform: translateY(-2px);
      background: #fff;
    }
    .sneaker-btn svg { transition: transform 0.3s; }
    .sneaker-btn:hover svg { transform: translateX(4px); }
    .cyan-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      pointer-events: none;
      z-index: 0;
    }
    .cyan-orb-1 {
      width: 600px; height: 600px;
      top: -100px; right: -200px;
      background: radial-gradient(circle, var(--sneaker-dim) 0%, transparent 70%);
    }
    .cyan-orb-2 {
      width: 700px; height: 700px;
      bottom: -200px; left: -200px;
      background: radial-gradient(circle, var(--sneaker-dim) 0%, transparent 70%);
    }
  `;
  document.head.appendChild(style);

  // Update page title
  document.title = `${spreadsheet.title} | Mahé Brizion`;

  // Build the DOM
  const mainWrapper = document.createElement('div');
  
  let itemsHtml = '';
  if (spreadsheet.items && spreadsheet.items.length > 0) {
    spreadsheet.items.forEach((item, index) => {
      itemsHtml += `
        <article class="sneaker-card reveal active">
          <div class="sneaker-watermark">${String(index+1).padStart(2, '0')}</div>
          <div class="sneaker-content">
            <h2 class="sneaker-title">${item.title}</h2>
            <span class="sneaker-price">${item.price}</span>
            <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="sneaker-btn">
              Acheter
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
        </article>
      `;
    });
  } else {
    itemsHtml = '<p style="color:var(--text-muted); grid-column: 1 / -1; text-align:center;">Cette sélection est vide pour le moment.</p>';
  }

  mainWrapper.innerHTML = `
    <!-- Ambient orbs Cyan Theme -->
    <div class="hero-ambient" aria-hidden="true">
      <div class="cyan-orb cyan-orb-1"></div>
      <div class="cyan-orb cyan-orb-2"></div>
    </div>
    <div class="hero-grid" aria-hidden="true"></div>

    <!-- HEADER -->
    <header role="banner" class="scrolled">
      <nav id="nav" aria-label="Navigation principale">
        <div class="wrap nav-row">
          <a href="/" class="nav-logo" aria-label="Retour à l'accueil">MB<span>.</span></a>
          <ul class="nav-links" role="list">
            <li><a href="/">Accueil</a></li>
            <li><a href="/spreadsheet">Spreadsheets</a></li>
          </ul>
        </div>
      </nav>
    </header>

    <main id="main-content-dynamic">
      <section class="spreadsheet-hero">
        <p class="s-label reveal active" data-num="01" aria-hidden="true">La sélection du chef</p>
        <h1 class="spreadsheet-title reveal active reveal-d1">${spreadsheet.title.replace(' ', '<br><span class="accent">')}</span></h1>
        <p class="spreadsheet-subtitle reveal active reveal-d2">Une sélection exclusive de sneakers, claquettes et sacs à dos au meilleur prix.</p>
      </section>

      <div class="shoes-grid">
        ${itemsHtml}
      </div>
    </main>

    <footer style="position: relative; z-index: 2;">
      <div class="wrap">
        <div class="footer-bottom reveal active">
          <span>© 2026 Mahé Brizion — La Sélection du Chef</span>
        </div>
      </div>
    </footer>
  `;

  document.body.appendChild(mainWrapper);

  // Remove the old main-content
  const oldMain = document.getElementById('main-content');
  if (oldMain) oldMain.remove();
}
