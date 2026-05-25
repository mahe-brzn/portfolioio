// ─── SUPABASE CONFIG ─────────────────────────────────────────────────────────
// Ce fichier est partagé entre toutes les pages publiques du site.
// Remplacez ces deux valeurs par celles de votre projet Supabase.
// (Projet > Settings > API)

const SUPABASE_URL  = 'https://snbldqyjfabjbogqclid.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuYmxkcXlqZmFiamJvZ3FjbGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDQzNDAsImV4cCI6MjA5NTIyMDM0MH0.idbnztDL3h_jD1yNaCUmV_CGiAYvKu4Yiwx2ubiN9JM';

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



  // Chargement de la carte recrutement dynamique
  const { data: settingsData } = await window._supabase.from('settings').select('*').eq('id', 'recrutement').single();
  if (settingsData && settingsData.value && settingsData.value.active) {
    const url = settingsData.value.url || 'contact.html';
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
        <p class="equipe-card-desc" style="margin-bottom: 16px;">Passionné de mécanique et prêt à rejoindre une équipe dynamique en Tarentaise ? Contactez-nous !</p>
        <a href="${url}" class="btn-outline" style="display:inline-block; padding: 8px 16px; font-size: 0.8rem; border-color: rgba(255,255,255,0.2);">Postuler</a>
      </div>`;
    grid.appendChild(joinCard);
  }

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

// ── HORAIRES & LIVE STATUS ──────────────────────────────────────────

// Update status badges across all pages
async function loadRealtimeStatus() {
  const { data, error } = await window._supabase.from('horaires').select('*').order('sort_order');
  if (error || !data || data.length === 0) return;

  // Obtenir le jour et l'heure actuels à Paris
  const now = new Date();
  const options = { timeZone: 'Europe/Paris', weekday: 'long', hour: 'numeric', minute: 'numeric', hour12: false };
  const formatter = new Intl.DateTimeFormat('fr-FR', options);
  const parts = formatter.formatToParts(now);
  
  let currentDay = '';
  let currentHour = 0;
  let currentMinute = 0;

  parts.forEach(p => {
    if (p.type === 'weekday') currentDay = p.value.charAt(0).toUpperCase() + p.value.slice(1);
    if (p.type === 'hour') currentHour = parseInt(p.value, 10);
    if (p.type === 'minute') currentMinute = parseInt(p.value, 10);
  });

  const exceptionnel = data.find(d => d.day === 'Exceptionnel');
  const isExceptionnelClosed = exceptionnel && exceptionnel.closed;

  const today = data.find(d => d.day === currentDay);
  let isOpen = false;

  if (!isExceptionnelClosed && today && !today.closed) {
    const timeToMin = (t) => {
      if (!t) return 0;
      const [h, m] = t.split(':');
      return parseInt(h, 10) * 60 + parseInt(m, 10);
    };
    const currentMin = currentHour * 60 + currentMinute;
    
    const mo = timeToMin(today.morning_open);
    const mc = timeToMin(today.morning_close);
    const ao = timeToMin(today.afternoon_open);
    const ac = timeToMin(today.afternoon_close);

    if ((currentMin >= mo && currentMin <= mc) || (currentMin >= ao && currentMin <= ac)) {
      isOpen = true;
    }
  }

  // Update DOM badges
  document.querySelectorAll('.nav-status').forEach(el => {
    el.setAttribute('aria-label', isOpen ? 'Statut : ouvert' : 'Statut : fermé');
    const dot = el.querySelector('.nav-dot');
    const text = el.querySelector('span:not(.nav-dot)');
    if (dot) dot.style.backgroundColor = isOpen ? 'var(--green)' : 'var(--red)';
    if (text) {
      if (isExceptionnelClosed) {
        text.textContent = 'Fermeture exceptionnelle';
        text.style.color = 'var(--red)';
      } else {
        text.textContent = isOpen ? 'Ouvert' : 'Fermé';
        text.style.color = isOpen ? 'var(--green)' : 'var(--red)';
      }
    }
  });

  // Update specific info badge in location.html if it exists
  const infoStatus = document.getElementById('location-current-status');
  if (infoStatus) {
    if (isExceptionnelClosed) {
      infoStatus.textContent = 'Fermeture exceptionnelle ●';
      infoStatus.style.color = '#ff5252';
    } else {
      infoStatus.textContent = isOpen ? 'Ouvert ●' : 'Fermé ●';
      infoStatus.style.color = isOpen ? '#22c55e' : '#ff5252';
    }
  }
}

// Populate the dynamic hours table in location.html
async function loadLocationHours() {
  const table = document.getElementById('horaires-dynamic-table');
  if (!table) return;

  const { data, error } = await window._supabase.from('horaires').select('*').order('sort_order');
  if (error || !data) return;

  const publicData = data.filter(d => d.day !== 'Exceptionnel');

  table.innerHTML = '';
  publicData.forEach(h => {
    const row = document.createElement('div');
    row.className = 'horaire-row';
    const formatTime = (t) => t ? t.substring(0, 5).replace(':', 'h') : '';
    
    if (h.closed) {
      row.innerHTML = `<span class="horaire-day">${h.day}</span><span class="horaire-closed">Fermé</span>`;
    } else {
      let timeStr = '';
      if (h.morning_open && h.morning_close) {
        timeStr += `${formatTime(h.morning_open)} – ${formatTime(h.morning_close)}`;
      }
      if (h.afternoon_open && h.afternoon_close) {
        if (timeStr) timeStr += ' / ';
        timeStr += `${formatTime(h.afternoon_open)} – ${formatTime(h.afternoon_close)}`;
      }
      row.innerHTML = `<span class="horaire-day">${h.day}</span><span class="horaire-time">${timeStr}</span>`;
    }
    table.appendChild(row);
  });
}

// Auto-détection de la page et chargement
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('equipe-grid'))    loadEquipePage();
  if (document.getElementById('vehicules-grid')) loadVehiculesPage();
  
  // Call globally
  loadRealtimeStatus();
  if (document.getElementById('horaires-dynamic-table')) loadLocationHours();
});
