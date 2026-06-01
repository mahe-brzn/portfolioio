(async function() {
  try {
    const supabaseClient = window.supabaseClient;
    if (!supabaseClient) {
      alert("Erreur critique : Supabase n'a pas pu se charger. Vérifiez votre connexion ou désactivez votre bloqueur de publicités.");
      return;
    }

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  let slug = pathParts[pathParts.length - 1];
  if (slug === 'index.html' || slug === 'index.htm') {
    slug = pathParts[pathParts.length - 2];
  }
  // Strip any accidental .html extension from the slug itself
  slug = slug.replace('.html', '').replace('.htm', '');

  try {
    const { data: spreadsheet, error } = await supabaseClient
      .from('spreadsheets')
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single();

    if (error || !spreadsheet) {
      console.error("Erreur de chargement de la spreadsheet:", error);
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.style.display = 'flex';
        const errDetails = error ? (error.message || JSON.stringify(error)) : 'Introuvable dans la base de données.';
        mainContent.innerHTML += `<div style="margin-top:40px; padding:20px; background:rgba(255,0,0,0.1); border:1px solid red; border-radius:8px; color:red; max-width:80%; word-break:break-all; font-family:monospace; font-size:0.85rem;"><strong>Détails techniques :</strong><br>Slug cherché: "${slug}"<br>Erreur: ${errDetails}</div>`;
      }
      return;
    }
    
    // Fetch author profile separately to avoid relation errors
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email, display_name')
      .eq('id', spreadsheet.owner_id)
      .maybeSingle();
      
    if (profile) {
      spreadsheet.profiles = profile;
    }
    
    try {
      let visitedData = JSON.parse(localStorage.getItem('visited_spreadsheets') || '{}');
      visitedData[slug] = new Date().toISOString();
      localStorage.setItem('visited_spreadsheets', JSON.stringify(visitedData));
    } catch(e) {}

    renderSpreadsheet(spreadsheet);

  } catch (e) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.style.display = 'block';
  }
  } catch (globalError) {
    alert("CRASH DANS VIEW.JS:\n" + globalError.message + "\n\nStack:\n" + globalError.stack);
    console.error(globalError);
  }
})();

function renderSpreadsheet(spreadsheet) {
  // Ensure auth-modal is loaded
  if (!document.querySelector('script[src^="/spreadsheet/auth-modal.js"]')) {
    const script = document.createElement('script');
    script.src = '/spreadsheet/auth-modal.js?v=' + Date.now();
    document.head.appendChild(script);
  }

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
      --sneaker-accent: ${spreadsheet.accent_color || '#c8ff57'};
      --sneaker-dim: color-mix(in srgb, var(--sneaker-accent) 15%, transparent);
      --sneaker-glow: color-mix(in srgb, var(--sneaker-accent) 40%, transparent);
      --sneaker-border: color-mix(in srgb, var(--sneaker-accent) 30%, transparent);
      --sneaker-text-dim: color-mix(in srgb, var(--sneaker-accent) 5%, transparent);
    }
    body { overflow-y: auto !important; }
    .nav-logo span, .link-num, .s-label::before { color: var(--sneaker-accent) !important; }
    ::selection { background: var(--sneaker-accent) !important; color: #000 !important; }
    ::-moz-selection { background: var(--sneaker-accent) !important; color: #000 !important; }
    
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
      font-size: clamp(2.5rem, 8vw, 8rem);
      font-weight: 800;
      color: #fff;
      line-height: 1;
      letter-spacing: -0.03em;
      margin-bottom: 24px;
      word-break: break-word;
      overflow-wrap: anywhere;
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
      border-color: var(--sneaker-border);
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.6), 0 0 40px var(--sneaker-text-dim);
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
      color: var(--sneaker-text-dim);
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

    /* Mobile Optimization */
    @media (max-width: 900px) {
      .shoes-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 0 12px 60px; }
      .sneaker-card { padding: 16px 12px; min-height: auto; }
      .sneaker-title { font-size: 1.1rem !important; }
      .sneaker-price { font-size: 1.2rem !important; margin-bottom: 12px !important; padding-bottom: 20px; }
      .sneaker-btn { padding: 12px 20px; font-size: 0.75rem; width: 100%; justify-content: center; }
      .spreadsheet-hero { padding: 80px 16px 40px; }
      .spreadsheet-title { font-size: clamp(2.2rem, 7vw, 4rem) !important; }
    }
    @media (max-width: 360px) {
      .shoes-grid { grid-template-columns: 1fr; gap: 16px; padding: 0 16px 60px; }
      .sneaker-card { padding: 20px 16px; }
      .sneaker-title { font-size: 1.3rem !important; }
      .sneaker-price { font-size: 1.4rem !important; margin-bottom: 20px !important; padding-bottom: 30px; }
      .sneaker-btn { width: auto; justify-content: flex-start; }
      .spreadsheet-hero { min-height: 25vh; }
      .spreadsheet-title { font-size: clamp(1.8rem, 9vw, 2.8rem) !important; }
      .spreadsheet-subtitle { font-size: 0.95rem; }
      .cyan-orb-1 { top: -200px; right: -300px; }
      #grain { display: none !important; }
    }

    #sneaker-search:focus { border-color: var(--sneaker-accent); box-shadow: 0 0 15px var(--sneaker-dim); }
    
    .social-actions { display: flex; gap: 15px; justify-content: center; margin-top: 20px; flex-wrap: wrap; position: relative; z-index: 20; pointer-events: auto; }
    .action-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 10px 20px; border-radius: 100px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-family: var(--font-body); font-weight: 500; transition: all 0.3s; font-size: 0.9rem; position: relative; z-index: 20; }
    .action-btn:hover { background: rgba(255,255,255,0.1); transform: translateY(-2px); }
    .action-btn.active-like { background: rgba(255, 82, 82, 0.2); border-color: rgba(255, 82, 82, 0.5); color: #ff5252; }
    .action-btn.active-fav { background: rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.5); color: #ffd700; }
    
    .comments-section { max-width: 800px; margin: 0 auto; padding: 0 20px 100px 20px; position: relative; z-index: 10; }
    .comments-title { font-family: var(--font-display); font-size: 2rem; margin-bottom: 20px; }
    .comment-item { background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 15px; }
    .comment-author { font-weight: bold; color: var(--sneaker-accent); margin-bottom: 5px; font-size: 0.9rem; }
    .comment-text { font-size: 1rem; color: rgba(255,255,255,0.8); }
    .comment-form { display: flex; gap: 10px; margin-top: 30px; }
    .comment-input { flex: 1; padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.4); color: white; outline: none; position: relative; z-index: 10; }
    .comment-submit { background: var(--sneaker-accent); color: black; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; position: relative; z-index: 10; }

    /* Force background elements to ignore pointers */
    .hero-ambient, .hero-grid, .cyan-orb { pointer-events: none !important; }
    .spreadsheet-hero { position: relative; z-index: 5; pointer-events: none; }
    .spreadsheet-hero > * { pointer-events: auto; }

    /* Agent Modal */
    .agent-modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      z-index: 100000; display: flex; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none; transition: opacity 0.3s;
    }
    .agent-modal-overlay.active { opacity: 1; pointer-events: auto; }
    .agent-modal {
      background: rgba(20, 20, 20, 0.95); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px;
      width: 90%; max-width: 500px; padding: 30px; position: relative;
      transform: translateY(20px); transition: transform 0.3s; box-shadow: 0 40px 80px rgba(0,0,0,0.8);
    }
    .agent-modal-overlay.active .agent-modal { transform: translateY(0); }
    .agent-modal-close {
      position: absolute; top: 20px; right: 20px; background: none; border: none; color: white; cursor: pointer; opacity: 0.5; transition: 0.3s; padding: 5px;
    }
    .agent-modal-close:hover { opacity: 1; transform: scale(1.1); }
    
    .am-title { font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 10px; color: var(--white); }
    .am-price { font-size: 1.2rem; font-weight: bold; color: var(--sneaker-accent); margin-bottom: 15px; }
    .am-details { display: flex; gap: 15px; margin-bottom: 20px; font-size: 0.9rem; color: rgba(255,255,255,0.7); flex-wrap: wrap; }
    .am-detail-pill { background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); }
    
    .am-btn-copy {
      width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2);
      color: white; border-radius: 12px; font-weight: bold; cursor: pointer; margin-bottom: 30px; transition: 0.3s;
    }
    .am-btn-copy:hover { background: rgba(255,255,255,0.1); }
    
    .am-agents-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,255,255,0.5); margin-bottom: 15px; text-align: center; }
    .am-agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; }
    .am-agent-btn {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
      padding: 10px; color: white; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: 0.2s; text-align: center;
    }
    .am-agent-btn:hover { background: var(--sneaker-accent); color: black; border-color: var(--sneaker-accent); transform: translateY(-2px); }
  `;
  document.head.appendChild(style);

  
  // Update page title
  document.title = `${spreadsheet.title} | Mahé Brizion`;

  // --- Dynamic SEO Injection ---
  const currentUrl = window.location.href;
  const seoDesc = spreadsheet.description || 'Une sélection exclusive de sneakers, claquettes et sacs à dos au meilleur prix.';

  // Canonical
  let canonical = document.querySelector("link[rel='canonical']");
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", currentUrl);

  // Meta Description
  let metaDesc = document.querySelector("meta[name='description']");
  if (!metaDesc) {
    metaDesc = document.createElement("meta");
    metaDesc.setAttribute("name", "description");
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute("content", seoDesc);

  // Open Graph
  const ogTags = {
    "og:title": `${spreadsheet.title} | Mahé Brizion`,
    "og:description": seoDesc,
    "og:url": currentUrl,
    "og:type": "website",
    "og:site_name": "Mahé Brizion"
  };

  Object.keys(ogTags).forEach(property => {
    let metaTag = document.querySelector(`meta[property='${property}']`);
    if (!metaTag) {
      metaTag = document.createElement("meta");
      metaTag.setAttribute("property", property);
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute("content", ogTags[property]);
  });
  // -----------------------------

  // Custom Cursor color adaptation
  if (spreadsheet.accent_color) {
    document.documentElement.style.setProperty('--sneaker-accent', spreadsheet.accent_color);
    document.documentElement.style.setProperty('--accent', spreadsheet.accent_color);
  } else {
    document.documentElement.style.setProperty('--accent', '#c8ff57');
  }

  // --- Currency Logic ---
  let prefCurrency = localStorage.getItem('pref_currency');
  if (!prefCurrency) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Europe')) prefCurrency = 'EUR';
    else if (tz.includes('America')) prefCurrency = 'USD';
    else if (tz.includes('London')) prefCurrency = 'GBP';
    else prefCurrency = 'EUR';
    localStorage.setItem('pref_currency', prefCurrency);
  }
  const cSym = prefCurrency === 'EUR' ? '€' : prefCurrency === 'USD' ? '$' : prefCurrency === 'GBP' ? '£' : '¥';
  // Optional multiplier if prices in DB are in Yuan and we want automatic conversion
  // We'll just display the symbol for now since the user didn't specify a conversion rate
  // If the user entered "40", it will show "40€". If they entered "40€", it stays "40€".

  // Build the DOM
  const mainWrapper = document.createElement('div');
  
  let itemsHtml = '';
  if (spreadsheet.items && spreadsheet.items.length > 0) {
    spreadsheet.items.forEach((item, index) => {
      if (!item) return; // Crash protection
      
      // Parse price to numeric value for sorting safely
      const priceStr = String(item.price || '');
      const titleStr = String(item.title || '');
      const keywordsStr = String(item.keywords || '');
      
      const rawPrice = priceStr.replace(/[^0-9.,]/g, '').replace(',', '.');
      const numPrice = parseFloat(rawPrice) || 0;
      
      let displayPrice = priceStr || 'Prix inconnu';
      if (numPrice > 0 && !priceStr.match(/[€$£¥]/)) {
        displayPrice = numPrice + cSym;
      }
      
      itemsHtml += `
        <article class="sneaker-card reveal active" data-index="${index}" data-price="${numPrice}" data-title="${titleStr.replace(/"/g, '&quot;').toLowerCase()}" data-keywords="${keywordsStr.replace(/"/g, '&quot;').toLowerCase()}" style="cursor:pointer;" onclick="window.openAgentModal(${index})">
          <div class="sneaker-watermark">${String(index+1).padStart(2, '0')}</div>
          <div class="sneaker-content">
            <h2 class="sneaker-title">${titleStr || 'Produit inconnu'}</h2>
            <span class="sneaker-price">${displayPrice} <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal; margin-left:4px;">HT</span></span>

            <button onclick="window.fastBuy(event, ${index})" class="sneaker-btn">
              Achat Rapide ⚡️
            </button>
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
    

    <main id="main-content-dynamic">
      <section class="spreadsheet-hero" style="position: relative;">
        <!-- Top Nav within hero -->
        <div style="position: absolute; top: 20px; left: 20px; right: 20px; display: flex; justify-content: space-between; z-index: 10;">
          <a href="/spreadsheet" class="btn-back-mobile" style="color: rgba(255,255,255,0.6); text-decoration: none; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; font-family: var(--font-body); transition: color 0.3s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='rgba(255,255,255,0.6)'">&larr; Retour</a>
          
          <a href="/spreadsheet/profile/index.html" style="color: rgba(255,255,255,0.6); text-decoration: none; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; font-family: var(--font-body); transition: color 0.3s;" onmouseover="this.style.color='var(--sneaker-accent)'" onmouseout="this.style.color='rgba(255,255,255,0.6)'">
            Mon Profil 
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </a>
        </div>
        
        <p class="s-label reveal active" data-num="01" aria-hidden="true">${spreadsheet.badge_text || 'La sélection du chef'}</p>
        <h1 class="spreadsheet-title reveal active reveal-d1">${spreadsheet.title.includes(' ') ? spreadsheet.title.replace(' ', '<br><span class="accent">') + '</span>' : spreadsheet.title}</h1>
        <p class="spreadsheet-subtitle reveal active reveal-d2">${spreadsheet.description || 'Une sélection exclusive de sneakers, claquettes et sacs à dos au meilleur prix.'}</p>
        <p class="spreadsheet-subtitle reveal active reveal-d2" style="font-size:0.85rem; opacity:0.6; margin-top:10px;">Par ${spreadsheet.profiles?.display_name || spreadsheet.profiles?.email?.split('@')[0] || 'Communauté'} • Mis à jour le ${new Date(spreadsheet.created_at).toLocaleDateString('fr-FR')}</p>
        
        <div class="social-actions reveal active" style="transition-delay: 0.3s; position: relative; z-index: 9999; pointer-events: auto !important;">
          <button class="action-btn" id="btn-like" style="pointer-events: auto !important;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            <span id="like-count">${spreadsheet.likes_count || 0}</span>
          </button>
          <button class="action-btn" id="btn-fav" style="pointer-events: auto !important;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            Favoris
          </button>
          <button class="action-btn" id="btn-suggest" style="pointer-events: auto !important;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            Suggérer
          </button>
          <button class="action-btn" id="btn-duplicate" style="pointer-events: auto !important;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            Dupliquer
          </button>
        </div>
      </section>

      
      <div class="search-container" style="max-width: 800px; margin: -20px auto 40px auto; padding: 0 clamp(24px, 5vw, 80px); position: relative; z-index: 5; display: flex; gap: 15px; flex-wrap: wrap;">
        <input type="text" id="sneaker-search" placeholder="Rechercher (ex: Jordan, Nike...)" style="flex: 1; min-width: 200px; padding: 16px 24px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.4); color: white; font-family: var(--font-body); font-size: 1rem; outline: none; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); transition: all 0.3s;" />
        
        <select id="sneaker-sort" style="padding: 12px 20px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); color: rgba(255,255,255,0.8); font-family: var(--font-body); font-size: 0.9rem; outline: none; backdrop-filter: blur(10px); cursor: pointer; transition: all 0.3s;">
          <option value="default" style="background: #111;">Tri par défaut</option>
          <option value="price-asc" style="background: #111;">Prix Croissant</option>
          <option value="price-desc" style="background: #111;">Prix Décroissant</option>
          <option value="name-asc" style="background: #111;">Nom (A-Z)</option>
          <option value="name-desc" style="background: #111;">Nom (Z-A)</option>
        </select>
      </div>
      
      <div class="shoes-grid" id="items-grid-container">
        ${itemsHtml}
      </div>

      <section class="comments-section">
        <h3 class="comments-title">Commentaires</h3>
        <div id="comments-list">
          <p style="color:var(--text-muted);">Chargement des commentaires...</p>
        </div>
        <form class="comment-form" id="comment-form">
          <input type="text" id="comment-input" class="comment-input" placeholder="Ajouter un commentaire..." required />
          <button type="submit" class="comment-submit">Envoyer</button>
        </form>
      </section>
    </main>

    <footer style="position: relative; z-index: 2;">
      <div class="wrap">
        <div class="footer-bottom reveal active">
          <span>© 2026 Mahé Brizion — ${spreadsheet.title}</span>
        </div>
      </div>
    </footer>

    <!-- Agent Modal -->
    <div class="agent-modal-overlay" id="agent-modal-overlay">
      <div class="agent-modal">
        <button class="agent-modal-close" id="agent-modal-close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <h2 class="am-title" id="am-title">Nom du produit</h2>
        <div class="am-price" id="am-price">25€</div>
        <div class="am-details">
          <div class="am-detail-pill" id="am-weight">~800g estimé</div>
          <div class="am-detail-pill" id="am-shipping">~15-25€ livraison</div>
        </div>
        <button class="am-btn-copy" id="am-btn-copy">🔗 Copier le lien original</button>
        
        <div class="am-agents-title">CHOISIR UN AGENT D'ACHAT</div>
        <div class="am-agents-grid" id="am-agents-grid">
          <!-- Buttons injected dynamically -->
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(mainWrapper);
  // Remove the old main-content
  const oldMain = document.getElementById('main-content');
  if (oldMain) oldMain.remove();


  // Ensure cursor elements are always on top by moving them to the end of the DOM
  const cursorDot = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');
  const grain = document.getElementById('grain');
  if (grain) document.body.appendChild(grain);
  if (cursorRing) document.body.appendChild(cursorRing);
  if (cursorDot) document.body.appendChild(cursorDot);

  // Agent Logic
  window.extractOriginalLink = (url) => {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      const searchParams = urlObj.searchParams;
      
      const possibleParams = ['url', 'productLink', 'product_url', 'src'];
      for (const param of possibleParams) {
        if (searchParams.has(param)) {
          let innerUrl = searchParams.get(param);
          if (innerUrl.startsWith('http')) {
            return window.extractOriginalLink(innerUrl); // extract recursively
          }
        }
      }
      return url; // Return original if no agent url param found
    } catch (e) {
      return url;
    }
  };

  window.convertAgentLink = (agent, rawUrl) => {
    // 1. Force extract the original Weidian/Taobao/1688 URL if hidden in an agent link
    let url = window.extractOriginalLink(rawUrl);
    const encoded = encodeURIComponent(url || '');

    // 2. Parse platform and product ID from the raw URL
    let platform = null;
    let id = null;
    if (url.includes('weidian.com')) {
      platform = 'weidian';
      const match = url.match(/itemID=(\d+)/);
      if (match) id = match[1];
    } else if (url.includes('taobao.com') || url.includes('tmall.com')) {
      platform = 'taobao';
      const match = url.match(/id=(\d+)/);
      if (match) id = match[1];
    } else if (url.includes('1688.com')) {
      platform = '1688';
      const match = url.match(/offer\/(\d+)/);
      if (match) id = match[1];
    }

    // Normalize agent name
    const a = agent.toLowerCase().replace(/\s+/g, '');

    // 3. Generate agent link — platform+id routes first (optimized), ?url= fallback
    switch(a) {
      case 'hippobuy':
      case 'hipobuy':
        // Official format: /product/weidian/ID  (confirmed via Reddit + HipoBuy SPA)
        if (platform && id) return `https://hipobuy.com/product/${platform}/${id}`;
        return `https://hipobuy.com/product/details?url=${encoded}`;

      case 'acbuy':
      case 'allchinabuy':
        return `https://www.allchinabuy.com/en/page/buy/?url=${encoded}`;

      case 'cnfans':
        return `https://cnfans.com/product/?url=${encoded}`;

      case 'superbuy':
        return `https://www.superbuy.com/en/page/buy/?nTag=Home-search&url=${encoded}`;

      case 'wegobuy':
        return `https://www.wegobuy.com/en/page/buy/?url=${encoded}`;

      case 'cssbuy':
        if (platform && id) {
          const cssType = platform === 'weidian' ? 'micro' : platform;
          return `https://www.cssbuy.com/item-${cssType}-${id}.html`;
        }
        return `https://www.cssbuy.com/item.html?url=${encoded}`;

      case 'sugargoo':
        return `https://www.sugargoo.com/#/home/productDetail?productLink=${encoded}`;

      case 'oopbuy':
        if (platform && id) return `https://www.oopbuy.com/product/${platform}/${id}`;
        return `https://www.oopbuy.com/product/?url=${encoded}`;

      case 'lovegobuy':
        return `https://lovegobuy.com/product/?url=${encoded}`;

      case 'mulebuy':
        if (platform && id) return `https://mulebuy.com/product/?shop_type=${platform}&id=${id}`;
        return `https://mulebuy.com/product/?url=${encoded}`;

      case 'litbuy':
        return `https://litbuy.com/product/?url=${encoded}`;

      case 'joyabuy':
        if (platform && id) return `https://joyabuy.com/product/?shop_type=${platform}&id=${id}`;
        return `https://joyabuy.com/product/?url=${encoded}`;

      default:
        // Default: HipoBuy with platform route
        if (platform && id) return `https://hipobuy.com/product/${platform}/${id}`;
        return `https://hipobuy.com/product/details?url=${encoded}`;
    }
  };

  const agentsList = ['AllChinaBuy', 'HipoBuy', 'CNFans', 'Superbuy', 'WeGoBuy', 'CSSBuy', 'Sugargoo', 'OopBuy', 'LoveGoBuy', 'Mulebuy', 'LitBuy'];

  window.fastBuy = (e, index) => {
    e.stopPropagation(); // prevent modal opening
    const item = spreadsheet.items[index];
    const favAgent = localStorage.getItem('favorite_agent') || 'hippobuy';
    const link = window.convertAgentLink(favAgent, item.url);
    window.open(link, '_blank');
  };

  window.openAgentModal = (index) => {
    const item = spreadsheet.items[index];
    const priceStr = String(item.price || '');
    const numPrice = parseFloat(priceStr.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
    let displayPrice = priceStr || 'Prix inconnu';
    if (numPrice > 0 && !priceStr.match(/[€$£¥]/)) displayPrice = numPrice + cSym;

    document.getElementById('am-title').textContent = item.title;
    document.getElementById('am-price').innerHTML = displayPrice + ' <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal; margin-left:4px;">HT</span>';
    document.getElementById('am-weight').textContent = item.weight || '~N/A estimé';
    document.getElementById('am-shipping').textContent = item.shipping_cost || '~N/A livraison';
    
    const copyBtn = document.getElementById('am-btn-copy');
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(item.url);
      const originalText = copyBtn.textContent;
      copyBtn.textContent = "✅ Lien copié !";
      setTimeout(() => copyBtn.textContent = originalText, 2000);
    };

    const grid = document.getElementById('am-agents-grid');
    grid.innerHTML = agentsList.map(agent => `
      <button class="am-agent-btn" onclick="window.open('${window.convertAgentLink(agent.toLowerCase(), item.url)}', '_blank')">${agent}</button>
    `).join('');

    document.getElementById('agent-modal-overlay').classList.add('active');
  };

  document.getElementById('agent-modal-close')?.addEventListener('click', () => {
    document.getElementById('agent-modal-overlay').classList.remove('active');
  });
  document.getElementById('agent-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'agent-modal-overlay') {
      document.getElementById('agent-modal-overlay').classList.remove('active');
    }
  });

  // Search logic
  const searchInput = document.getElementById('sneaker-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const cards = document.querySelectorAll('.sneaker-card');
      cards.forEach(card => {
        const title = card.querySelector('.sneaker-title').textContent.toLowerCase();
        const keywords = card.getAttribute('data-keywords') || '';
        if (title.includes(query) || keywords.includes(query)) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  // Sort logic
  const sortSelect = document.getElementById('sneaker-sort');
  const itemsGridContainer = document.getElementById('items-grid-container');
  if (sortSelect && itemsGridContainer) {
    sortSelect.addEventListener('change', (e) => {
      const sortValue = e.target.value;
      const cards = Array.from(itemsGridContainer.querySelectorAll('.sneaker-card'));
      
      cards.sort((a, b) => {
        if (sortValue === 'price-asc') {
          return parseFloat(a.getAttribute('data-price')) - parseFloat(b.getAttribute('data-price'));
        } else if (sortValue === 'price-desc') {
          return parseFloat(b.getAttribute('data-price')) - parseFloat(a.getAttribute('data-price'));
        } else if (sortValue === 'name-asc') {
          return a.getAttribute('data-title').localeCompare(b.getAttribute('data-title'));
        } else if (sortValue === 'name-desc') {
          return b.getAttribute('data-title').localeCompare(a.getAttribute('data-title'));
        } else {
          // Default: by original index
          return parseInt(a.getAttribute('data-index')) - parseInt(b.getAttribute('data-index'));
        }
      });
      
      // Re-append in new order
      cards.forEach(card => itemsGridContainer.appendChild(card));
    });
  }

  // --- SOCIAL LOGIC ---
  const btnLike = document.getElementById('btn-like');
  const btnFav = document.getElementById('btn-fav');
  const btnSuggest = document.getElementById('btn-suggest');
  const btnDuplicate = document.getElementById('btn-duplicate');
  const likeCountSpan = document.getElementById('like-count');

  // Load initial states (if logged in)
  const checkInteractions = async () => {
    // Fetch the real like count directly from DB
    const { count, error } = await supabaseClient.from('likes').select('*', { count: 'exact', head: true }).eq('spreadsheet_id', spreadsheet.id);
    if (!error && count !== null) {
      likeCountSpan.textContent = count;
    }

    if (!window.currentUser) return;
    
    // Check like
    const { data: like } = await supabaseClient.from('likes').select('*').eq('user_id', window.currentUser.id).eq('spreadsheet_id', spreadsheet.id).maybeSingle();
    if (like) btnLike.classList.add('active-like');
    
    // Check fav
    const { data: fav } = await supabaseClient.from('favorites').select('*').eq('user_id', window.currentUser.id).eq('spreadsheet_id', spreadsheet.id).maybeSingle();
    if (fav) btnFav.classList.add('active-fav');
  };
  // We need to wait for auth-modal to init
  setTimeout(checkInteractions, 1000);

  // Like Action
  btnLike.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log("Like clicked! Current user:", window.currentUser);
    if (!window.currentUser) {
      if (typeof window.openAuthModal !== 'function') {
        alert("Erreur de chargement du module de connexion. Rafraîchissez la page.");
        return;
      }
      return window.openAuthModal();
    }
    
    if (btnLike.classList.contains('active-like')) {
      await supabaseClient.from('likes').delete().eq('user_id', window.currentUser.id).eq('spreadsheet_id', spreadsheet.id);
      btnLike.classList.remove('active-like');
      let currentCount = parseInt(likeCountSpan.textContent) || 1;
      likeCountSpan.textContent = currentCount - 1;
    } else {
      await supabaseClient.from('likes').insert({ user_id: window.currentUser.id, spreadsheet_id: spreadsheet.id });
      btnLike.classList.add('active-like');
      let currentCount = parseInt(likeCountSpan.textContent) || 0;
      likeCountSpan.textContent = currentCount + 1;
    }
  });

  // Fav Action
  btnFav.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log("Fav clicked!");
    if (!window.currentUser) {
      if (typeof window.openAuthModal !== 'function') return alert("Erreur de module.");
      return window.openAuthModal();
    }
    
    if (btnFav.classList.contains('active-fav')) {
      await supabaseClient.from('favorites').delete().eq('user_id', window.currentUser.id).eq('spreadsheet_id', spreadsheet.id);
      btnFav.classList.remove('active-fav');
    } else {
      await supabaseClient.from('favorites').insert({ user_id: window.currentUser.id, spreadsheet_id: spreadsheet.id });
      btnFav.classList.add('active-fav');
    }
  });

  // Suggest Action
  btnSuggest.addEventListener('click', () => {
    if (!window.currentUser) return window.openAuthModal();
    
    const title = prompt("Titre de l'article suggéré :");
    if (!title) return;
    const url = prompt("Lien URL de l'article :");
    if (!url) return;
    const price = prompt("Prix (ex: 50€) :");
    const note = prompt("Pourquoi le suggérez-vous ? (optionnel)");
    
    supabaseClient.from('suggestions').insert({
      spreadsheet_id: spreadsheet.id,
      user_id: window.currentUser.id,
      title, url, price, note
    }).then(({error}) => {
      if (error) alert("Erreur: " + error.message);
      else alert("Suggestion envoyée ! Le créateur devra l'approuver.");
    });
  });

  // Duplicate Action
  btnDuplicate.addEventListener('click', async () => {
    if (!window.currentUser) return window.openAuthModal();
    if (!confirm("Voulez-vous dupliquer cette spreadsheet dans votre espace personnel ?")) return;
    
    const randomSlug = Math.random().toString(36).substring(2, 10);
    const { data, error } = await supabaseClient.from('spreadsheets').insert({
      owner_id: window.currentUser.id,
      title: "Copie de " + spreadsheet.title,
      slug: randomSlug,
      description: spreadsheet.description,
      badge_text: spreadsheet.badge_text,
      accent_color: spreadsheet.accent_color,
      items: spreadsheet.items,
      visibility: 'private' // Duplication is always private initially
    }).select();
    
    if (error) {
      alert("Erreur: " + error.message);
    } else {
      alert("Dupliquée avec succès ! Redirection vers votre copie.");
      window.location.href = "/spreadsheet/" + randomSlug;
    }
  });

  // --- COMMENTS LOGIC ---
  const commentsList = document.getElementById('comments-list');
  const commentForm = document.getElementById('comment-form');
  const commentInput = document.getElementById('comment-input');

  const loadComments = async () => {
    const { data, error } = await supabaseClient.from('comments').select('*, profiles(email)').eq('spreadsheet_id', spreadsheet.id).order('created_at', { ascending: true });
    
    if (error) {
      commentsList.innerHTML = '<p style="color:red;">Erreur de chargement des commentaires.</p>';
      return;
    }
    
    commentsList.innerHTML = '';
    if (data.length === 0) {
      commentsList.innerHTML = '<p style="color:var(--text-muted);">Aucun commentaire. Soyez le premier !</p>';
    } else {
      data.forEach(c => {
        const author = c.profiles?.email ? c.profiles.email.split('@')[0] : 'Utilisateur';
        const date = new Date(c.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
        
        let deleteBtn = '';
        if (window.currentUser && (window.currentUser.id === c.user_id || window.currentUser.id === spreadsheet.owner_id || window.currentProfile?.role === 'admin')) {
          deleteBtn = `<button onclick="deleteComment('${c.id}')" style="background:none; border:none; color:#ff5252; cursor:pointer; font-size:0.8rem; float:right;">Supprimer</button>`;
        }

        commentsList.innerHTML += `
          <div class="comment-item" id="comment-${c.id}">
            ${deleteBtn}
            <div class="comment-author">${author} <span style="color:var(--text-muted); font-size:0.8rem; font-weight:normal;">• ${date}</span></div>
            <div class="comment-text">${c.content.replace(/</g, "&lt;")}</div>
          </div>
        `;
      });
    }
  };

  window.deleteComment = async (id) => {
    if (!confirm("Supprimer ce commentaire ?")) return;
    await supabaseClient.from('comments').delete().eq('id', id);
    loadComments();
  };

  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!window.currentUser) return window.openAuthModal();
    
    const content = commentInput.value;
    const btn = commentForm.querySelector('button');
    btn.disabled = true; btn.textContent = '...';
    
    const { error } = await supabaseClient.from('comments').insert({
      spreadsheet_id: spreadsheet.id,
      user_id: window.currentUser.id,
      content
    });
    
    btn.disabled = false; btn.textContent = 'Envoyer';
    if (error) {
      alert("Erreur: " + error.message);
    } else {
      commentInput.value = '';
      loadComments();
    }
  });

  // Load comments (wait a bit for auth)
  setTimeout(loadComments, 500);
}
