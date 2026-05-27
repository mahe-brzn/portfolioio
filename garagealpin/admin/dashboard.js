// ─── CONFIGURATION SUPABASE ──────────────────────────────────────────────────
// Remplacez ces valeurs par celles de votre projet Supabase
const SUPABASE_URL  = 'https://snbldqyjfabjbogqclid.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuYmxkcXlqZmFiamJvZ3FjbGlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDQzNDAsImV4cCI6MjA5NTIyMDM0MH0.idbnztDL3h_jD1yNaCUmV_CGiAYvKu4Yiwx2ubiN9JM';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
// ─────────────────────────────────────────────────────────────────────────────

const BUCKET_EMPLOYEES = 'employees';
const BUCKET_VEHICLES  = 'vehicles';

// ── Auth Guard ────────────────────────────────────────────────────────────────
(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }

  // Afficher l'email utilisateur
  const email = session.user.email;
  document.getElementById('user-email').textContent = email;
  let dispName = email.split('@')[0];
  if (email.toLowerCase() === 'mahe@mahebrizion.fr') dispName = 'Mahé Brizion';
  else dispName = dispName.charAt(0).toUpperCase() + dispName.slice(1);
  document.getElementById('user-name').textContent = dispName;
  document.getElementById('user-avatar').textContent = dispName[0].toUpperCase();

  // Charger toutes les données
  loadEquipe();
  loadVehicules();
  loadServices();
  loadHoraires();
  loadRecruitmentSettings();
})();

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

// ── Theme Switcher ────────────────────────────────────────────────────────────
function applyTheme(theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

function setTheme(theme) {
  localStorage.setItem('admin-theme', theme);
  applyTheme(theme);
  // Update active button
  ['light', 'dark', 'system'].forEach(t => {
    const btn = document.getElementById(`btn-theme-${t}`);
    if (btn) btn.classList.toggle('active', t === theme);
  });
}

function initTheme() {
  const saved = localStorage.getItem('admin-theme') || 'light';
  setTheme(saved);
  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('admin-theme') === 'system') applyTheme('system');
  });
}
initTheme();

// ── Navigation ────────────────────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
  } else {
    sidebar.classList.add('open');
    if (overlay) overlay.classList.add('show');
  }
}

function showPage(pageId, navEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  if (navEl) navEl.classList.add('active');
  
  if (window.innerWidth <= 768) {
    toggleSidebar();
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = (type === 'success' ? '✓ ' : '✕ ') + message;
  t.className   = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
let _editingId = null;

function openModal(type, data = null) {
  _editingId = data?.id ?? null;
  const overlay = document.getElementById(`modal-${type}`);
  overlay.classList.add('open');

  if (type === 'employee') {
    document.getElementById('modal-employee-title').textContent = data ? 'Modifier le membre' : 'Nouveau membre';
    document.getElementById('employee-id').value      = data?.id    ?? '';
    document.getElementById('employee-name').value    = data?.name  ?? '';
    document.getElementById('employee-role').value    = data?.role  ?? '';
    document.getElementById('employee-desc').value    = data?.description ?? '';
    document.getElementById('employee-diplomes').value= data?.diplomes ?? '';
    document.getElementById('employee-img-url').value = data?.image_url   ?? '';
    document.getElementById('employee-order').value   = data?.sort_order  ?? '';
    resetImgPreview('emp-preview', 'emp-upload-zone', data?.image_url);
  }
  if (type === 'vehicle') {
    document.getElementById('modal-vehicle-title').textContent = data ? 'Modifier le véhicule' : 'Nouveau véhicule';
    document.getElementById('vehicle-id').value        = data?.id        ?? '';
    document.getElementById('vehicle-model').value     = data?.model     ?? '';
    document.getElementById('vehicle-category').value  = data?.category  ?? 'citadine';
    
    const vehType = data?.type ?? 'location';
    document.getElementById('vehicle-type').value      = vehType;
    document.getElementById('vehicle-price').value     = vehType === 'vente' ? (data?.price ?? '') : (data?.price_per_day ?? '');
    document.getElementById('label-price').textContent = vehType === 'vente' ? 'Prix de vente (€)' : 'Prix / jour (€)';
    
    document.getElementById('vehicle-year').value      = data?.year      ?? '';
    document.getElementById('vehicle-mileage').value   = data?.mileage   ?? '';
    document.getElementById('vehicle-fuel').value      = data?.fuel_type ?? '';
    document.getElementById('vehicle-transmission').value = data?.transmission ?? '';
    document.getElementById('vehicle-power').value     = data?.power     ?? '';
    document.getElementById('vehicle-features').value  = (data?.features ?? []).join(', ');
    document.getElementById('vehicle-desc').value      = data?.description ?? '';
    document.getElementById('vehicle-available').checked = data?.available ?? true;
    document.getElementById('vehicle-img-url').value   = data?.image_url ?? '';
    resetImgPreview('veh-preview', 'veh-upload-zone', data?.image_url);
  }
  if (type === 'service') {
    document.getElementById('modal-service-title').textContent = data ? 'Modifier le service' : 'Nouveau service';
    document.getElementById('service-id').value   = data?.id    ?? '';
    document.getElementById('service-name').value = data?.name  ?? '';
    document.getElementById('service-desc').value = data?.description ?? '';
    document.getElementById('service-order').value = data?.sort_order ?? '';
  }
}

function closeModal(type) {
  document.getElementById(`modal-${type}`).classList.remove('open');
  _editingId = null;
}

// Close on outside click
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

// ── Image Preview & Upload ─────────────────────────────────────────────────────
function previewImage(fileInputId, previewId, zoneId) {
  const file    = document.getElementById(fileInputId).files[0];
  if (!file) return;
  const reader  = new FileReader();
  reader.onload = e => {
    const img = document.getElementById(previewId);
    img.src   = e.target.result;
    img.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function resetImgPreview(previewId, zoneId, url) {
  const img = document.getElementById(previewId);
  if (url) { img.src = url; img.style.display = 'block'; }
  else      { img.src = ''; img.style.display = 'none'; }
}

async function uploadImage(fileInputId, bucket, folder) {
  const file = document.getElementById(fileInputId).files[0];
  if (!file) return null;

  const ext  = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabaseClient.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) { showToast('Erreur upload image : ' + error.message, 'error'); return null; }

  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ════════════════════════════════════════════════════════
// ── ÉQUIPE ───────────────────────────────────────────────
// ════════════════════════════════════════════════════════

async function loadRecruitmentSettings() {
  const { data, error } = await supabaseClient.from('settings').select('*').eq('id', 'recrutement').single();
  if (!error && data) {
    const val = data.value || {};
    document.getElementById('recruit-active-toggle').checked = val.active === true;
    document.getElementById('recruit-url-input').value = val.url || '';
  }
}

async function updateRecruitmentSettings() {
  const active = document.getElementById('recruit-active-toggle').checked;
  const url = document.getElementById('recruit-url-input').value;
  
  const { error } = await supabaseClient.from('settings').upsert({
    id: 'recrutement',
    value: { active, url }
  });
  
  if (error) {
    showToast('Erreur lors de la sauvegarde : ' + error.message, true);
  } else {
    showToast('Paramètres de recrutement enregistrés.');
  }
}

async function loadEquipe() {
  const grid = document.getElementById('equipe-grid');
  grid.innerHTML = '<div class="skeleton" style="height:320px;width:280px;"></div>'.repeat(4);

  const { data, error } = await supabaseClient.from('employees').select('*').order('sort_order');
  if (error) { showToast('Erreur chargement équipe', 'error'); return; }

  document.getElementById('equipe-count').textContent = `${data.length} membre${data.length > 1 ? 's' : ''}`;
  grid.innerHTML = '';

  data.forEach(emp => {
    const card = document.createElement('div');
    card.className = 'admin-card';
    card.innerHTML = `
      ${emp.image_url
        ? `<img class="admin-card-img" src="${emp.image_url}" alt="${emp.name}" loading="lazy" />`
        : `<div class="admin-card-img-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg><span>Pas de photo</span></div>`}
      <div class="admin-card-body">
        <div class="admin-card-title">${emp.name}</div>
        <div class="admin-card-sub">${emp.role}</div>
        <div class="admin-card-desc">${emp.description || '—'}</div>
        <div class="admin-card-actions">
          <button class="btn btn-ghost" onclick="openModal('employee', JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(emp)).replace(/'/g, '%27')}')))">✏️ Modifier</button>
          <button class="btn btn-danger" onclick="deleteEmployee('${emp.id}')">🗑 Supprimer</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

async function saveEmployee() {
  const btn  = document.getElementById('btn-save-employee');
  btn.disabled = true; btn.textContent = 'Enregistrement…';

  const id   = document.getElementById('employee-id').value;
  const file = document.getElementById('emp-file').files[0];

  let imageUrl = document.getElementById('employee-img-url').value || null;
  if (file) {
    const uploaded = await uploadImage('emp-file', BUCKET_EMPLOYEES, 'photos');
    if (uploaded) imageUrl = uploaded;
  }

  const payload = {
    name:        document.getElementById('employee-name').value,
    role:        document.getElementById('employee-role').value,
    description: document.getElementById('employee-desc').value,
    diplomes:    document.getElementById('employee-diplomes').value,
    image_url:   imageUrl,
    sort_order:  parseInt(document.getElementById('employee-order').value) || 99,
  };

  let error;
  if (id) {
    ({ error } = await supabaseClient.from('employees').update(payload).eq('id', id));
  } else {
    ({ error } = await supabaseClient.from('employees').insert(payload));
  }

  btn.disabled = false; btn.textContent = 'Enregistrer';

  if (error) { showToast('Erreur : ' + error.message, 'error'); return; }
  showToast(id ? 'Membre mis à jour !' : 'Membre ajouté !');
  closeModal('employee');
  loadEquipe();
}

async function deleteEmployee(id) {
  if (!confirm('Supprimer ce membre de l\'équipe ?')) return;
  const { error } = await supabaseClient.from('employees').delete().eq('id', id);
  if (error) { showToast('Erreur suppression', 'error'); return; }
  showToast('Membre supprimé.');
  loadEquipe();
}

// ════════════════════════════════════════════════════════
// ── VÉHICULES ────────────────────────────────────────────
// ════════════════════════════════════════════════════════
async function loadVehicules() {
  const grid = document.getElementById('vehicules-grid');
  grid.innerHTML = '<div class="skeleton" style="height:320px;width:280px;"></div>'.repeat(3);

  const { data, error } = await supabaseClient.from('vehicles').select('*').order('created_at');
  if (error) { showToast('Erreur chargement véhicules', 'error'); return; }

  document.getElementById('vehicules-count').textContent = `${data.length} véhicule${data.length > 1 ? 's' : ''}`;
  grid.innerHTML = '';

  data.forEach(v => {
    const available = v.available;
    const features  = Array.isArray(v.features) ? v.features : [];
    const card      = document.createElement('div');
    card.className  = 'admin-card';
    card.innerHTML  = `
      ${v.image_url
        ? `<img class="admin-card-img" src="${v.image_url}" alt="${v.model}" loading="lazy" />`
        : `<div class="admin-card-img-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg><span>Pas de photo</span></div>`}
      <div class="admin-card-body">
        <span class="badge-dispo ${available ? 'yes' : 'no'}">${available ? '● Disponible' : '○ Indisponible'}</span>
        <div class="admin-card-title">${v.model}</div>
        <div class="admin-card-sub">${v.category} · ${v.year || '—'} · ${v.price_per_day ? v.price_per_day + '€/j' : (v.price ? v.price + '€' : '—')}</div>
        <div class="admin-card-desc">${features.slice(0,3).join(' · ') || '—'}</div>
        <div class="admin-card-actions">
          <button class="btn btn-ghost" onclick="openModal('vehicle', JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(v)).replace(/'/g, '%27')}')))">✏️ Modifier</button>
          <button class="btn btn-danger" onclick="deleteVehicle('${v.id}')">🗑 Supprimer</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

async function saveVehicle() {
  const btn = document.getElementById('btn-save-vehicle');
  btn.disabled = true; btn.textContent = 'Enregistrement…';

  const id   = document.getElementById('vehicle-id').value;
  const file = document.getElementById('veh-file').files[0];

  let imageUrl = document.getElementById('vehicle-img-url').value || null;
  if (file) {
    const uploaded = await uploadImage('veh-file', BUCKET_VEHICLES, 'photos');
    if (uploaded) imageUrl = uploaded;
  }

  const featuresRaw = document.getElementById('vehicle-features').value;
  const features    = featuresRaw.split(',').map(f => f.trim()).filter(Boolean);

  const type = document.getElementById('vehicle-type').value;
  const priceVal = parseFloat(document.getElementById('vehicle-price').value) || null;

  const payload = {
    model:         document.getElementById('vehicle-model').value,
    category:      document.getElementById('vehicle-category').value,
    type:          type,
    price_per_day: type === 'location' ? priceVal : null,
    price:         type === 'vente' ? priceVal : null,
    year:          parseInt(document.getElementById('vehicle-year').value) || null,
    mileage:       parseInt(document.getElementById('vehicle-mileage').value) || null,
    fuel_type:     document.getElementById('vehicle-fuel').value || null,
    transmission:  document.getElementById('vehicle-transmission').value || null,
    power:         document.getElementById('vehicle-power').value || null,
    features,
    description:   document.getElementById('vehicle-desc').value,
    available:     document.getElementById('vehicle-available').checked,
    image_url:     imageUrl,
  };

  let error;
  if (id) {
    ({ error } = await supabaseClient.from('vehicles').update(payload).eq('id', id));
  } else {
    ({ error } = await supabaseClient.from('vehicles').insert(payload));
  }

  btn.disabled = false; btn.textContent = 'Enregistrer';

  if (error) { showToast('Erreur : ' + error.message, 'error'); return; }
  showToast(id ? 'Véhicule mis à jour !' : 'Véhicule ajouté !');
  closeModal('vehicle');
  loadVehicules();
}

async function deleteVehicle(id) {
  if (!confirm('Supprimer ce véhicule ?')) return;
  const { error } = await supabaseClient.from('vehicles').delete().eq('id', id);
  if (error) { showToast('Erreur suppression', 'error'); return; }
  showToast('Véhicule supprimé.');
  loadVehicules();
}

// ════════════════════════════════════════════════════════
// ── SERVICES ─────────────────────────────────────────────
// ════════════════════════════════════════════════════════
async function loadServices() {
  const grid = document.getElementById('services-grid');
  const { data, error } = await supabaseClient.from('services').select('*').order('sort_order');
  if (error) return;
  document.getElementById('services-count').textContent = `${data.length} service${data.length > 1 ? 's' : ''}`;
  grid.innerHTML = '';
  data.forEach(s => {
    const card = document.createElement('div');
    card.className = 'admin-card';
    card.innerHTML = `
      <div class="admin-card-body">
        <div class="admin-card-title">${s.name}</div>
        <div class="admin-card-desc">${s.description || '—'}</div>
        <div class="admin-card-actions">
          <button class="btn btn-ghost" onclick="openModal('service', JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(s)).replace(/'/g, '%27')}')))">✏️ Modifier</button>
          <button class="btn btn-danger" onclick="deleteService('${s.id}')">🗑 Supprimer</button>
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

async function saveService() {
  const id      = document.getElementById('service-id').value;
  const payload = {
    name:        document.getElementById('service-name').value,
    description: document.getElementById('service-desc').value,
    sort_order:  parseInt(document.getElementById('service-order').value) || 99,
  };
  let error;
  if (id) ({ error } = await supabaseClient.from('services').update(payload).eq('id', id));
  else    ({ error } = await supabaseClient.from('services').insert(payload));
  if (error) { showToast('Erreur : ' + error.message, 'error'); return; }
  showToast(id ? 'Service mis à jour !' : 'Service ajouté !');
  closeModal('service');
  loadServices();
}

async function deleteService(id) {
  if (!confirm('Supprimer ce service ?')) return;
  await supabaseClient.from('services').delete().eq('id', id);
  showToast('Service supprimé.');
  loadServices();
}

// ════════════════════════════════════════════════════════
// ── HORAIRES ─────────────────────────────────────────────
// ════════════════════════════════════════════════════════
const DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

async function loadHoraires() {
  const form = document.getElementById('horaires-form');
  const DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  
  const { data, error } = await supabaseClient.from('horaires').select('*').order('sort_order');
  
  // Exceptionnel logic
  const exceptionnelRow = data && data.find(d => d.day === 'Exceptionnel');
  const isExceptionnelClosed = exceptionnelRow ? exceptionnelRow.closed : false;
  
  const toggleExc = document.getElementById('toggle-exceptionnel');
  if (toggleExc) toggleExc.checked = isExceptionnelClosed;
  
  const statusTextExc = document.getElementById('exceptionnel-status-text');
  if (statusTextExc) {
    if (isExceptionnelClosed) {
      statusTextExc.textContent = 'Fermeture forcée !';
      statusTextExc.style.color = 'var(--red)';
    } else {
      statusTextExc.textContent = 'Désactivée';
      statusTextExc.style.color = 'var(--text-muted)';
    }
  }

  const publicData = data ? data.filter(d => d.day !== 'Exceptionnel' && !d.day.match(/^\d{4}-\d{2}-\d{2}$/)) : [];
  const horaires = publicData.length ? publicData : DAYS.map((d, i) => ({
    day: d, sort_order: i + 1,
    morning_open: '08:00', morning_close: '12:00',
    afternoon_open: '14:00', afternoon_close: '18:00',
    closed: d === 'Dimanche',
  }));

  form.innerHTML = '';
  horaires.forEach(h => {
    const row = document.createElement('div');
    row.style.cssText = 'background:var(--white);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);';
    row.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <span style="font-family:Syne,sans-serif;font-weight:700;">${h.day}</span>
        <div style="display:flex;align-items:center;gap:10px;">
          <span id="status-text-${h.day}" style="font-size:0.85rem;font-weight:600;color:${!h.closed ? 'var(--green)' : 'var(--red)'};">${!h.closed ? 'Ouvert' : 'Fermé'}</span>
          <label class="toggle" title="Ouvert ce jour">
            <input type="checkbox" id="open-${h.day}" ${!h.closed ? 'checked' : ''} onchange="toggleDayRow('${h.day}', this.checked)" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div id="times-${h.day}" style="${h.closed ? 'display:none' : 'display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;'}">
        <div><label>Matin ouvre</label><input type="time" id="mo-${h.day}" value="${h.morning_open || '08:00'}" /></div>
        <div><label>Matin ferme</label><input type="time" id="mc-${h.day}" value="${h.morning_close || '12:00'}" /></div>
        <div><label>A-midi ouvre</label><input type="time" id="ao-${h.day}" value="${h.afternoon_open || '14:00'}" /></div>
        <div><label>A-midi ferme</label><input type="time" id="ac-${h.day}" value="${h.afternoon_close || '17:00'}" /></div>
      </div>`;
    form.appendChild(row);
  });
  
  loadHolidays();
  loadCustomDates();
}

function toggleDayRow(day, isOpen) {
  const el = document.getElementById(`times-${day}`);
  const statusText = document.getElementById(`status-text-${day}`);
  
  if (isOpen) {
    el.style.display = 'grid';
    el.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
    el.style.gap = '10px';
    statusText.textContent = 'Ouvert';
    statusText.style.color = 'var(--green)';
  } else {
    el.style.display = 'none';
    statusText.textContent = 'Fermé';
    statusText.style.color = 'var(--red)';
  }
}

async function toggleExceptionnel(isClosed) {
  const statusText = document.getElementById('exceptionnel-status-text');
  if (isClosed) {
    statusText.textContent = 'Fermeture forcée !';
    statusText.style.color = 'var(--red)';
  } else {
    statusText.textContent = 'Désactivée';
    statusText.style.color = 'var(--text-muted)';
  }
  
  const { error } = await supabaseClient.from('horaires').upsert([{
    day: 'Exceptionnel',
    sort_order: 99,
    closed: isClosed
  }], { onConflict: 'day' });
  
  if (error) {
    showToast('Erreur sauvegarde exceptionnelle', 'error');
  } else {
    showToast('Mode exceptionnel mis à jour !');
  }
}

async function saveHoraires() {
  const DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  const rows = DAYS.map((day, i) => ({
    day,
    sort_order: i + 1,
    closed: !(document.getElementById(`open-${day}`)?.checked ?? false),
    morning_open:     document.getElementById(`mo-${day}`)?.value || null,
    morning_close:    document.getElementById(`mc-${day}`)?.value || null,
    afternoon_open:   document.getElementById(`ao-${day}`)?.value || null,
    afternoon_close:  document.getElementById(`ac-${day}`)?.value || null,
  }));

  // Upsert sur la colonne "day"
  const { error } = await supabaseClient.from('horaires').upsert(rows, { onConflict: 'day' });
  if (error) { showToast('Erreur sauvegarde horaires : ' + error.message, 'error'); return; }
  showToast('Horaires mis à jour !');
}

async function loadHolidays() {
  const container = document.getElementById('holidays-list');
  if (!container) return;
  
  try {
    const res = await fetch('https://calendrier.api.gouv.fr/jours-feries/metropole.json');
    const apiData = await res.json();
    
    const { data: overrides, error } = await supabaseClient.from('horaires').select('*');
    const dbOverrides = overrides || [];
    
    const now = new Date();
    now.setHours(0,0,0,0);
    
    const holidays = Object.keys(apiData)
      .map(dateStr => ({ date: new Date(dateStr), dateStr: dateStr, name: apiData[dateStr] }))
      .filter(h => h.date >= now)
      .sort((a, b) => a.date - b.date)
      .slice(0, 3);
      
    if (holidays.length === 0) {
      container.innerHTML = '<span style="font-size:0.85rem;color:var(--text-muted);">Aucun jour férié à venir</span>';
      return;
    }
    
    container.innerHTML = '';
    holidays.forEach(h => {
      const override = dbOverrides.find(d => d.day === h.dateStr);
      let overrideMode = 'normal';
      if (override) {
        overrideMode = override.closed ? 'closed' : 'custom';
      }
      
      const mo = override?.morning_open || '08:00';
      const mc = override?.morning_close || '12:00';
      const ao = override?.afternoon_open || '14:00';
      const ac = override?.afternoon_close || '18:00';
      
      const daysDiff = Math.ceil((h.date - now) / (1000 * 60 * 60 * 24));
      const options = { weekday: 'long', day: 'numeric', month: 'long' };
      const dateFr = h.date.toLocaleDateString('fr-FR', options);
      
      const item = document.createElement('div');
      item.style.cssText = 'background:rgba(255,255,255,0.03); padding:12px; border-radius:6px; font-size:0.85rem; border:1px solid rgba(255,255,255,0.05);';
      
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toggleHolidayDetails('${h.dateStr}')">
          <div>
            <span style="font-weight:600; color:var(--white); display:block;">${h.name}</span>
            <span style="color:var(--text-muted); text-transform:capitalize; font-size:0.8rem;">${dateFr}</span>
          </div>
          <div style="text-align:right;">
            <span style="color:var(--red); font-weight:600; font-size:0.8rem; display:block;">Dans ${daysDiff} j.</span>
            <span style="color:${overrideMode === 'normal' ? 'var(--text-muted)' : (overrideMode === 'closed' ? 'var(--red)' : 'var(--green)')}; font-size:0.75rem;">
              ${overrideMode === 'normal' ? 'Horaires habituels' : (overrideMode === 'closed' ? 'Fermé' : 'Aménagé')}
            </span>
          </div>
        </div>
        
        <div id="hol-details-${h.dateStr}" style="display:none; margin-top:16px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1);">
          <div style="display:flex; gap:12px; margin-bottom:12px;">
            <label style="cursor:pointer; display:flex; align-items:center; gap:4px;">
              <input type="radio" name="mode-${h.dateStr}" value="normal" ${overrideMode === 'normal' ? 'checked' : ''} onchange="toggleHolidayMode('${h.dateStr}')" /> Normal
            </label>
            <label style="cursor:pointer; display:flex; align-items:center; gap:4px;">
              <input type="radio" name="mode-${h.dateStr}" value="closed" ${overrideMode === 'closed' ? 'checked' : ''} onchange="toggleHolidayMode('${h.dateStr}')" /> Fermé
            </label>
            <label style="cursor:pointer; display:flex; align-items:center; gap:4px;">
              <input type="radio" name="mode-${h.dateStr}" value="custom" ${overrideMode === 'custom' ? 'checked' : ''} onchange="toggleHolidayMode('${h.dateStr}')" /> Aménagé
            </label>
          </div>
          
          <div id="hol-times-${h.dateStr}" style="display:${overrideMode === 'custom' ? 'grid' : 'none'}; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
            <div><label style="font-size:0.75rem;">Matin ouvre</label><input type="time" id="hol-mo-${h.dateStr}" value="${mo}" style="padding:4px; font-size:0.8rem; width:100%; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;" /></div>
            <div><label style="font-size:0.75rem;">Matin ferme</label><input type="time" id="hol-mc-${h.dateStr}" value="${mc}" style="padding:4px; font-size:0.8rem; width:100%; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;" /></div>
            <div><label style="font-size:0.75rem;">A-midi ouvre</label><input type="time" id="hol-ao-${h.dateStr}" value="${ao}" style="padding:4px; font-size:0.8rem; width:100%; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;" /></div>
            <div><label style="font-size:0.75rem;">A-midi ferme</label><input type="time" id="hol-ac-${h.dateStr}" value="${ac}" style="padding:4px; font-size:0.8rem; width:100%; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;" /></div>
          </div>
          
          <button class="btn btn-primary" style="padding:6px 12px; font-size:0.8rem; width:100%;" onclick="saveHolidayOverride('${h.dateStr}')">Enregistrer pour ce jour</button>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = '<span style="font-size:0.85rem;color:var(--red);">Erreur de chargement</span>';
  }
}

function toggleHolidayDetails(dateStr) {
  const el = document.getElementById(`hol-details-${dateStr}`);
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
}

function toggleHolidayMode(dateStr) {
  const mode = document.querySelector(`input[name="mode-${dateStr}"]:checked`).value;
  const timesEl = document.getElementById(`hol-times-${dateStr}`);
  if (timesEl) {
    timesEl.style.display = mode === 'custom' ? 'grid' : 'none';
  }
}

async function saveHolidayOverride(dateStr) {
  const mode = document.querySelector(`input[name="mode-${dateStr}"]:checked`).value;
  
  if (mode === 'normal') {
    const { error } = await supabaseClient.from('horaires').delete().eq('day', dateStr);
    if (error) showToast('Erreur : ' + error.message, 'error');
    else { showToast('Horaire réinitialisé !'); loadHolidays(); }
  } else {
    const isClosed = mode === 'closed';
    const mo = document.getElementById(`hol-mo-${dateStr}`)?.value || null;
    const mc = document.getElementById(`hol-mc-${dateStr}`)?.value || null;
    const ao = document.getElementById(`hol-ao-${dateStr}`)?.value || null;
    const ac = document.getElementById(`hol-ac-${dateStr}`)?.value || null;
    
    const { error } = await supabaseClient.from('horaires').upsert([{
      day: dateStr, sort_order: 999, closed: isClosed,
      morning_open: isClosed ? null : mo, morning_close: isClosed ? null : mc,
      afternoon_open: isClosed ? null : ao, afternoon_close: isClosed ? null : ac
    }], { onConflict: 'day' });
    
    if (error) { showToast('Erreur : ' + error.message, 'error'); }
    else { showToast('Exception sauvegardée !'); loadHolidays(); loadCustomDates(); }
  }
}

async function loadCustomDates() {
  const container = document.getElementById('custom-dates-list');
  if (!container) return;
  
  const { data: overrides, error } = await supabaseClient.from('horaires').select('*');
  if (error || !overrides) {
    container.innerHTML = '<span style="font-size:0.85rem;color:var(--red);">Erreur de chargement</span>';
    return;
  }
  
  const customDates = overrides.filter(d => d.day.match(/^\d{4}-\d{2}-\d{2}$/));
  
  const now = new Date();
  now.setHours(0,0,0,0);
  
  const futureDates = customDates.filter(d => new Date(d.day) >= now);
  
  if (futureDates.length === 0) {
    container.innerHTML = '<span style="font-size:0.85rem;color:var(--text-muted);">Aucune date configurée</span>';
    return;
  }
  
  futureDates.sort((a, b) => new Date(a.day) - new Date(b.day));
  
  container.innerHTML = '';
  futureDates.forEach(override => {
    const d = new Date(override.day);
    const mo = override.morning_open || '08:00';
    const mc = override.morning_close || '12:00';
    const ao = override.afternoon_open || '14:00';
    const ac = override.afternoon_close || '18:00';
    
    const overrideMode = override.closed ? 'closed' : 'custom';
    
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateFr = d.toLocaleDateString('fr-FR', options);
    
    const daysDiff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    const countdown = daysDiff === 0 ? "Aujourd'hui" : (daysDiff === 1 ? "Demain" : `Dans ${daysDiff} j.`);
    
    const h = { dateStr: override.day, name: 'Date personnalisée' };
    
    const item = document.createElement('div');
    item.style.cssText = 'background:rgba(255,255,255,0.03); padding:12px; border-radius:6px; font-size:0.85rem; border:1px solid rgba(255,255,255,0.05);';
    
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="toggleHolidayDetails('${h.dateStr}')">
        <div>
          <span style="font-weight:600; color:var(--white); display:block;">${h.name}</span>
          <span style="color:var(--text-muted); text-transform:capitalize; font-size:0.8rem;">${dateFr}</span>
        </div>
        <div style="text-align:right;">
          <span style="color:var(--red); font-weight:600; font-size:0.8rem; display:block;">${countdown}</span>
          <span style="color:${overrideMode === 'closed' ? 'var(--red)' : 'var(--green)'}; font-size:0.75rem;">
            ${overrideMode === 'closed' ? 'Fermé' : 'Aménagé'}
          </span>
        </div>
      </div>
      
      <div id="hol-details-${h.dateStr}" style="display:none; margin-top:16px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.1);">
        <div style="display:flex; gap:12px; margin-bottom:12px;">
          <label style="cursor:pointer; display:flex; align-items:center; gap:4px;">
            <input type="radio" name="mode-${h.dateStr}" value="normal" onchange="toggleHolidayMode('${h.dateStr}')" /> Supprimer
          </label>
          <label style="cursor:pointer; display:flex; align-items:center; gap:4px;">
            <input type="radio" name="mode-${h.dateStr}" value="closed" ${overrideMode === 'closed' ? 'checked' : ''} onchange="toggleHolidayMode('${h.dateStr}')" /> Fermé
          </label>
          <label style="cursor:pointer; display:flex; align-items:center; gap:4px;">
            <input type="radio" name="mode-${h.dateStr}" value="custom" ${overrideMode === 'custom' ? 'checked' : ''} onchange="toggleHolidayMode('${h.dateStr}')" /> Aménagé
          </label>
        </div>
        
        <div id="hol-times-${h.dateStr}" style="display:${overrideMode === 'custom' ? 'grid' : 'none'}; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
          <div><label style="font-size:0.75rem;">Matin ouvre</label><input type="time" id="hol-mo-${h.dateStr}" value="${mo}" style="padding:4px; font-size:0.8rem; width:100%; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;" /></div>
          <div><label style="font-size:0.75rem;">Matin ferme</label><input type="time" id="hol-mc-${h.dateStr}" value="${mc}" style="padding:4px; font-size:0.8rem; width:100%; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;" /></div>
          <div><label style="font-size:0.75rem;">A-midi ouvre</label><input type="time" id="hol-ao-${h.dateStr}" value="${ao}" style="padding:4px; font-size:0.8rem; width:100%; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;" /></div>
          <div><label style="font-size:0.75rem;">A-midi ferme</label><input type="time" id="hol-ac-${h.dateStr}" value="${ac}" style="padding:4px; font-size:0.8rem; width:100%; background:var(--bg); border:1px solid var(--border); color:var(--text); border-radius:4px;" /></div>
        </div>
        
        <button class="btn btn-primary" style="padding:6px 12px; font-size:0.8rem; width:100%;" onclick="saveHolidayOverride('${h.dateStr}')">Enregistrer</button>
      </div>
    `;
    container.appendChild(item);
  });
}

async function addCustomDate() {
  const input = document.getElementById('custom-date-input');
  const dateStr = input.value;
  if (!dateStr) {
    showToast('Veuillez sélectionner une date.', 'error');
    return;
  }
  
  const { error } = await supabaseClient.from('horaires').upsert([{
    day: dateStr, sort_order: 999, closed: true
  }], { onConflict: 'day' });
  
  if (error) {
    showToast('Erreur : ' + error.message, 'error');
  } else {
    showToast('Date ajoutée avec succès !');
    input.value = '';
    loadCustomDates();
  }
}
