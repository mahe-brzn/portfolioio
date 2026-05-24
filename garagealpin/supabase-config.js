// ─── SUPABASE CONFIG ─────────────────────────────────────────────────────────
// Ce fichier est partagé entre toutes les pages publiques du site.
// Remplacez ces deux valeurs par celles de votre projet Supabase.
// (Projet > Settings > API)

const SUPABASE_URL  = 'VOTRE_SUPABASE_URL';
const SUPABASE_ANON = 'VOTRE_SUPABASE_ANON_KEY';

window._supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;

// ─── CHARGEMENT ÉQUIPE ───────────────────────────────────────────────────────
async function loadEquipePage() {
  const grid = document.getElementById('equipe-grid');
  if (!grid || !window._supabase) return;

  const { data, error } = await window._supabase
    .from('employees')
    .select('*')
    .order('sort_order');

  if (error || !data || data.length === 0) {
    // Fallback : laisser les squelettes disparaître
    grid.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:40px 0;grid-column:1/-1;">Impossible de charger l\'équipe.</p>';
    return;
  }

  grid.innerHTML = '';

  const delays = ['', 'reveal-d1', 'reveal-d2', '', 'reveal-d1', 'reveal-d2'];
  data.forEach((emp, i) => {
    const article = document.createElement('article');
    article.className = `equipe-card tilt-card reveal ${delays[i % 3]}`;
    article.setAttribute('aria-label', `${emp.name}, ${emp.role}`);

    article.innerHTML = `
      <div class="equipe-card-img-wrap">
        ${emp.image_url
          ? `<img src="${emp.image_url}" alt="${emp.name}" class="equipe-card-img" loading="lazy" />`
          : `<div style="height:clamp(280px,35vw,420px);background:var(--bg-2);display:flex;align-items:center;justify-content:center;">
               <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
             </div>`}
      </div>
      <div class="equipe-card-body">
        <h3 class="equipe-card-name">${emp.name}</h3>
        <p class="equipe-card-role">${emp.role}</p>
        ${emp.description ? `<p class="equipe-card-desc">${emp.description}</p>` : ''}
      </div>`;

    grid.appendChild(article);
  });

  // Carte "Nous recrutons" toujours à la fin
  const joinCard = document.createElement('article');
  joinCard.className = 'equipe-card tilt-card reveal reveal-d2';
  joinCard.setAttribute('aria-label', "Rejoindre l'équipe");
  joinCard.innerHTML = `
    <div class="equipe-card-img-wrap" style="background:var(--bg-2);display:flex;align-items:center;justify-content:center;height:clamp(280px,35vw,420px);">
      <div style="text-align:center;padding:32px;">
        <div style="width:64px;height:64px;border:1px solid var(--border);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <p style="font-size:0.85rem;color:var(--text-muted);">Nous recrutons</p>
      </div>
    </div>
    <div class="equipe-card-body">
      <h3 class="equipe-card-name">Vous ?</h3>
      <p class="equipe-card-role">Poste à pourvoir</p>
      <p class="equipe-card-desc">Passionné de mécanique et prêt à rejoindre une équipe dynamique en Tarentaise ? Contactez-nous !</p>
    </div>`;
  grid.appendChild(joinCard);

  // Réinitialiser les animations (le script.js observe le DOM au chargement)
  if (typeof initReveal === 'function') initReveal();
}

// ─── CHARGEMENT VÉHICULES ────────────────────────────────────────────────────
async function loadVehiculesPage() {
  const grid = document.getElementById('vehicules-grid');
  if (!grid || !window._supabase) return;

  const { data, error } = await window._supabase
    .from('vehicles')
    .select('*')
    .eq('available', true)
    .order('created_at');

  if (error || !data || data.length === 0) {
    grid.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:40px 0;grid-column:1/-1;">Aucun véhicule disponible pour le moment.</p>';
    return;
  }

  grid.innerHTML = '';

  const delays = ['', 'reveal-d1', 'reveal-d2'];
  data.forEach((v, i) => {
    const features = Array.isArray(v.features) ? v.features : [];
    const card     = document.createElement('div');
    card.className = `vehicle-card tilt-card reveal ${delays[i % 3]}`;

    card.innerHTML = `
      ${v.image_url
        ? `<div class="vehicle-card-img-wrap"><img src="${v.image_url}" alt="${v.model}" loading="lazy" /></div>`
        : `<div class="vehicle-card-img-wrap" style="background:var(--bg-2);height:220px;display:flex;align-items:center;justify-content:center;">
             <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
           </div>`}
      <div class="vehicle-card-body">
        <div class="vehicle-card-header">
          <h3 class="vehicle-card-model">${v.model}</h3>
          ${v.price_per_day ? `<span class="vehicle-price">${v.price_per_day}€<small>/j</small></span>` : ''}
        </div>
        <div class="vehicle-card-meta">${v.category}${v.year ? ' · ' + v.year : ''}</div>
        ${features.length ? `<div class="vehicle-features">${features.map(f => `<span>${f}</span>`).join('')}</div>` : ''}
        ${v.description ? `<p class="vehicle-card-desc">${v.description}</p>` : ''}
        <a href="contact.html" class="btn-vehicle">Demander ce véhicule</a>
      </div>`;

    grid.appendChild(card);
  });

  if (typeof initReveal === 'function') initReveal();
}

// Auto-détection de la page et chargement
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('equipe-grid'))    loadEquipePage();
  if (document.getElementById('vehicules-grid')) loadVehiculesPage();
});
