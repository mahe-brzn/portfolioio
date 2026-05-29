(async function() {
  const supabaseClient = window.supabaseClient;
  if (!supabaseClient) return;

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const slug = pathParts[pathParts.length - 1]; // e.g. "mon-lien"

  try {
    const { data: spreadsheet, error } = await supabaseClient
      .from('spreadsheets')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !spreadsheet) {
      // Show normal page (index or 404)
      const mainContent = document.getElementById('main-content');
      if (mainContent) mainContent.style.display = 'block';
      return;
    }

    renderSpreadsheet(spreadsheet);

  } catch (e) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.style.display = 'block';
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

    /* Extreme Mobile Optimization */
    @media (max-width: 600px) {
      .spreadsheet-hero { padding: 60px 20px 40px; min-height: 25vh; }
      .spreadsheet-title { font-size: clamp(2rem, 9vw, 2.8rem) !important; }
      .spreadsheet-subtitle { font-size: 1rem; }
      .shoes-grid { grid-template-columns: 1fr; gap: 20px; padding: 0 16px 60px; }
      .sneaker-card { padding: 20px 16px; min-height: auto; }
      .sneaker-title { font-size: 1.3rem !important; }
      .sneaker-price { font-size: 1rem !important; margin-bottom: 20px !important; }
      .sneaker-btn { width: 100%; justify-content: center; }
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

  // Build the DOM
  const mainWrapper = document.createElement('div');
  
  let itemsHtml = '';
  if (spreadsheet.items && spreadsheet.items.length > 0) {
    spreadsheet.items.forEach((item, index) => {
      // Parse price to numeric value for sorting
      const rawPrice = item.price.replace(/[^0-9.,]/g, '').replace(',', '.');
      const numPrice = parseFloat(rawPrice) || 0;
      
      itemsHtml += `
        <article class="sneaker-card reveal active" data-index="${index}" data-price="${numPrice}" data-title="${item.title.replace(/"/g, '&quot;').toLowerCase()}" data-keywords="${(item.keywords || '').replace(/"/g, '&quot;').toLowerCase()}">
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
    

    <main id="main-content-dynamic">
      <section class="spreadsheet-hero">
        <a href="/spreadsheet" class="btn-back-mobile" style="position: absolute; top: 20px; left: 20px; color: rgba(255,255,255,0.6); text-decoration: none; font-size: 0.85rem; display: flex; align-items: center; gap: 8px; z-index: 10; font-family: var(--font-body);">&larr; Retour aux Spreadsheets</a>
        <p class="s-label reveal active" data-num="01" aria-hidden="true">${spreadsheet.badge_text || 'La sélection du chef'}</p>
        <h1 class="spreadsheet-title reveal active reveal-d1">${spreadsheet.title.includes(' ') ? spreadsheet.title.replace(' ', '<br><span class="accent">') + '</span>' : spreadsheet.title}</h1>
        <p class="spreadsheet-subtitle reveal active reveal-d2">${spreadsheet.description || 'Une sélection exclusive de sneakers, claquettes et sacs à dos au meilleur prix.'}</p>
        <p class="spreadsheet-subtitle reveal active reveal-d2" style="font-size:0.85rem; opacity:0.6; margin-top:10px;">Par ${spreadsheet.profiles?.email || 'Admin'} • Mis à jour le ${new Date(spreadsheet.created_at).toLocaleDateString('fr-FR')}</p>
        
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
        
        <select id="sneaker-sort" style="padding: 16px 24px; border-radius: 100px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.8); color: white; font-family: var(--font-body); font-size: 1rem; outline: none; backdrop-filter: blur(10px); cursor: pointer;">
          <option value="default">Tri par défaut</option>
          <option value="price-asc">Prix Croissant</option>
          <option value="price-desc">Prix Décroissant</option>
          <option value="name-asc">Nom (A-Z)</option>
          <option value="name-desc">Nom (Z-A)</option>
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
  `;

  document.body.appendChild(mainWrapper);

  // Remove the old main-content
  const oldMain = document.getElementById('main-content');
  if (oldMain) oldMain.remove();

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
    if (!window.currentUser) return;
    
    // Check like
    const { data: like } = await supabaseClient.from('likes').select('*').eq('user_id', window.currentUser.id).eq('spreadsheet_id', spreadsheet.id).single();
    if (like) btnLike.classList.add('active-like');
    
    // Check fav
    const { data: fav } = await supabaseClient.from('favorites').select('*').eq('user_id', window.currentUser.id).eq('spreadsheet_id', spreadsheet.id).single();
    if (fav) btnFav.classList.add('active-fav');
  };
  // We need to wait for auth-modal to init
  setTimeout(checkInteractions, 1000);

  // Like Action
  btnLike.addEventListener('click', async () => {
    if (!window.currentUser) return window.openAuthModal();
    
    if (btnLike.classList.contains('active-like')) {
      await supabaseClient.from('likes').delete().eq('user_id', window.currentUser.id).eq('spreadsheet_id', spreadsheet.id);
      btnLike.classList.remove('active-like');
      likeCountSpan.textContent = parseInt(likeCountSpan.textContent) - 1;
    } else {
      await supabaseClient.from('likes').insert({ user_id: window.currentUser.id, spreadsheet_id: spreadsheet.id });
      btnLike.classList.add('active-like');
      likeCountSpan.textContent = parseInt(likeCountSpan.textContent) + 1;
    }
  });

  // Fav Action
  btnFav.addEventListener('click', async () => {
    if (!window.currentUser) return window.openAuthModal();
    
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
