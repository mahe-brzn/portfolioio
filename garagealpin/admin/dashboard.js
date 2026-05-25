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
    document.getElementById('employee-img-url').value = data?.image_url   ?? '';
    document.getElementById('employee-order').value   = data?.sort_order  ?? '';
    resetImgPreview('emp-preview', 'emp-upload-zone', data?.image_url);
  }
  if (type === 'vehicle') {
    document.getElementById('modal-vehicle-title').textContent = data ? 'Modifier le véhicule' : 'Nouveau véhicule';
    document.getElementById('vehicle-id').value        = data?.id        ?? '';
    document.getElementById('vehicle-model').value     = data?.model     ?? '';
    document.getElementById('vehicle-category').value  = data?.category  ?? 'citadine';
    document.getElementById('vehicle-price').value     = data?.price_per_day ?? '';
    document.getElementById('vehicle-year').value      = data?.year      ?? '';
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
        <div class="admin-card-sub">${v.category} · ${v.year || '—'} · ${v.price_per_day ? v.price_per_day + '€/j' : '—'}</div>
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

  const payload = {
    model:         document.getElementById('vehicle-model').value,
    category:      document.getElementById('vehicle-category').value,
    price_per_day: parseFloat(document.getElementById('vehicle-price').value) || null,
    year:          parseInt(document.getElementById('vehicle-year').value) || null,
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

  const publicData = data ? data.filter(d => d.day !== 'Exceptionnel') : [];
  const horaires = publicData.length ? publicData : DAYS.map((d, i) => ({
    day: d, sort_order: i + 1,
    morning_open: '08:00', morning_close: '12:00',
    afternoon_open: '14:00', afternoon_close: '18:00',
    closed: d === 'Dimanche',
  }));

  form.innerHTML = '';
  horaires.forEach(h => {
    const row = document.createElement('div');
    row.style.cssText = 'background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:12px;';
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
    const data = await res.json();
    
    const now = new Date();
    // Zero out hours for fair day comparison
    now.setHours(0,0,0,0);
    
    const holidays = Object.keys(data)
      .map(dateStr => ({ date: new Date(dateStr), name: data[dateStr] }))
      .filter(h => h.date >= now)
      .sort((a, b) => a.date - b.date)
      .slice(0, 3);
      
    if (holidays.length === 0) {
      container.innerHTML = '<span style="font-size:0.85rem;color:var(--text-muted);">Aucun jour férié à venir</span>';
      return;
    }
    
    container.innerHTML = '';
    holidays.forEach(h => {
      const daysDiff = Math.ceil((h.date - now) / (1000 * 60 * 60 * 24));
      const options = { weekday: 'long', day: 'numeric', month: 'long' };
      const dateStr = h.date.toLocaleDateString('fr-FR', options);
      
      const item = document.createElement('div');
      item.style.cssText = 'background:rgba(255,255,255,0.03); padding:12px; border-radius:6px; font-size:0.85rem; display:flex; flex-direction:column; gap:4px; border:1px solid rgba(255,255,255,0.05);';
      
      item.innerHTML = `
        <span style="font-weight:600; color:var(--white);">${h.name}</span>
        <div style="display:flex; justify-content:space-between; color:var(--text-muted); margin-top:2px;">
          <span style="text-transform:capitalize;">${dateStr}</span>
          <span style="color:var(--red); font-weight:600;">Dans ${daysDiff} j.</span>
        </div>
      `;
      container.appendChild(item);
    });
  } catch (err) {
    container.innerHTML = '<span style="font-size:0.85rem;color:var(--red);">Erreur de chargement</span>';
  }
}
