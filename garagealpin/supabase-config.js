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
        ${emp.diplomes ? `<div class="equipe-card-diplomes" style="margin-bottom:12px; font-size:0.8rem; color:var(--text-muted); display:flex; align-items:flex-start; gap:6px;">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-top:2px; flex-shrink:0;"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
           <span>${emp.diplomes}</span>
         </div>` : ''}
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
let allVehicles = []; // Store globally for modal access

async function loadVehiculesPage() {
  const loading = document.getElementById('vehicules-loading');
  const sectionVente = document.getElementById('section-vente');
  const sectionLocation = document.getElementById('section-location');
  const listVente = document.getElementById('vehicules-vente-list');
  const listLocation = document.getElementById('vehicules-location-list');

  if (!loading || !window._supabase) return;

  const { data, error } = await window._supabase
    .from('vehicles')
    .select('*')
    .eq('available', true)
    .order('created_at');

  loading.style.display = 'none';

  if (error || !data || data.length === 0) {
    loading.style.display = 'block';
    loading.innerHTML = '<p style="color:var(--text-muted);">Aucun véhicule disponible pour le moment.</p>';
    return;
  }

  allVehicles = data;

  const ventes = data.filter(v => v.type === 'vente');
  const locations = data.filter(v => v.type === 'location' || !v.type);

  if (ventes.length > 0) {
    sectionVente.style.display = 'block';
    listVente.innerHTML = ventes.map((v, i) => renderVehicleCard(v, i, 'vente')).join('');
  }
  if (locations.length > 0) {
    sectionLocation.style.display = 'block';
    listLocation.innerHTML = locations.map((v, i) => renderVehicleCard(v, i, 'location')).join('');
  }

  if (typeof window.initReveal === 'function') window.initReveal();
}

function renderVehicleCard(v, index, type) {
  const delays = ['', 'reveal-d1', 'reveal-d2'];
  const delay = delays[index % 3];
  
  const priceDisplay = type === 'vente' 
    ? (v.price ? `${v.price}€` : 'Sur demande')
    : (v.price_per_day ? `${v.price_per_day}€<small>/j</small>` : 'Sur demande');

  const imgHtml = v.image_url 
    ? `<div class="veh-hz-img"><img src="${v.image_url}" alt="${v.model}" loading="lazy" /></div>`
    : `<div class="veh-hz-img" style="background:var(--bg-2);display:flex;align-items:center;justify-content:center;"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>`;

  const feats = Array.isArray(v.features) ? v.features : [];
  const featHtml = feats.length 
    ? feats.map(f => `<span style="padding:6px 12px;background:rgba(255,255,255,0.05);border-radius:20px;font-size:0.8rem;border:1px solid var(--border);">${f}</span>`).join('')
    : '<span style="color:var(--text-muted);font-size:0.85rem;">Aucun équipement spécifié</span>';

  return `
    <div class="vehicle-card-hz reveal ${delay}" id="veh-card-${v.id}">
      <div class="veh-hz-top">
        ${imgHtml}
        <div class="veh-hz-body">
          <div class="veh-hz-header">
            <h3 class="veh-hz-title">${v.model}</h3>
            <div class="veh-hz-price">${priceDisplay}</div>
          </div>
          <div class="veh-hz-meta">${v.category}${v.year ? ' · ' + v.year : ''}</div>
          
          <div class="veh-hz-specs">
            ${v.mileage ? `<div class="veh-spec-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/></svg>${v.mileage.toLocaleString('fr-FR')} km</div>` : ''}
            ${v.fuel_type ? `<div class="veh-spec-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 21h18M5 21V7l8-4v18M13 11h4v4h-4z"/></svg>${v.fuel_type}</div>` : ''}
            ${v.transmission ? `<div class="veh-spec-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>${v.transmission}</div>` : ''}
            ${v.power ? `<div class="veh-spec-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>${v.power}</div>` : ''}
          </div>
          
          <div class="veh-hz-actions">
            <button class="btn-magnetic" onclick="toggleVehicleDetails('${v.id}')">
              <span id="veh-btn-text-${v.id}">Voir les détails</span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Accordion Details -->
      <div class="veh-hz-details" id="veh-details-${v.id}">
        <p style="color:var(--text-muted); line-height:1.6; margin-bottom:24px;">${v.description ? v.description.replace(/\n/g, '<br>') : 'Aucune description fournie.'}</p>
        
        <h4 style="font-size:1.1rem; margin-bottom:16px;">Équipements</h4>
        <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:32px;">
          ${featHtml}
        </div>

        <form action="https://formspree.io/f/meoqzzvw" method="POST" class="v-contact-form">
          <h4 style="margin-bottom:16px; font-size:1.2rem;">${type === 'vente' ? 'Être recontacté pour ce véhicule' : 'Réserver ce véhicule'}</h4>
          <input type="hidden" name="Sujet" value="Demande pour ${type === 'vente' ? 'Achat' : 'Location'} : ${v.model}" />
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px; margin-bottom:16px;">
            <div><label>Nom complet</label><input type="text" name="Nom" required /></div>
            <div><label>Téléphone</label><input type="tel" name="Telephone" required /></div>
          </div>
          <div style="margin-bottom:16px;">
            <label>E-mail</label>
            <input type="email" name="Email" required />
          </div>
          <div style="margin-bottom:24px;">
            <label>Message</label>
            <textarea name="Message" rows="4" placeholder="Bonjour, je souhaite avoir plus d'informations..." required></textarea>
          </div>
          <button type="submit" class="btn-magnetic" style="width:100%; justify-content:center;">Envoyer la demande</button>
        </form>
      </div>
    </div>
  `;
}

window.toggleVehicleDetails = function(id) {
  const detailsBlock = document.getElementById(`veh-details-${id}`);
  const btnText = document.getElementById(`veh-btn-text-${id}`);
  if (!detailsBlock) return;

  if (detailsBlock.classList.contains('open')) {
    detailsBlock.classList.remove('open');
    btnText.textContent = "Voir les détails";
  } else {
    // Close others
    document.querySelectorAll('.veh-hz-details.open').forEach(el => {
      el.classList.remove('open');
      const bid = el.id.replace('veh-details-', '');
      const bt = document.getElementById(`veh-btn-text-${bid}`);
      if(bt) bt.textContent = "Voir les détails";
    });
    
    detailsBlock.classList.add('open');
    btnText.textContent = "Masquer les détails";
    
    // Scroll to it
    setTimeout(() => {
      detailsBlock.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }
};

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

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const currentDateStr = `${yyyy}-${mm}-${dd}`;

  let today = data.find(d => d.day === currentDateStr);
  if (!today) {
    today = data.find(d => d.day === currentDay);
  }

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

  const publicData = data.filter(d => d.day !== 'Exceptionnel' && !d.day.match(/^\d{4}-\d{2}-\d{2}$/));

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
  if (document.getElementById('vehicules-loading')) loadVehiculesPage();
  
  // Call globally
  loadRealtimeStatus();
  if (document.getElementById('horaires-dynamic-table')) loadLocationHours();
});
