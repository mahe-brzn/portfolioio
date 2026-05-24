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
  document.getElementById('user-name').textContent  = email.split('@')[0];
  document.getElementById('user-avatar').textContent = email[0].toUpperCase();

  // Charger toutes les données
  loadEquipe();
  loadVehicules();
  loadServices();
  loadHoraires();
})();

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

// ── Navigation ────────────────────────────────────────────────────────────────
function showPage(pageId, navEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  if (navEl) navEl.classList.add('active');
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
          <button class="btn btn-ghost" onclick='openModal("employee", ${JSON.stringify(emp).replace(/'/g, "\\'")})'>✏️ Modifier</button>
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
          <button class="btn btn-ghost" onclick='openModal("vehicle", ${JSON.stringify(v).replace(/'/g, "\\'")})'>✏️ Modifier</button>
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
          <button class="btn btn-ghost" onclick='openModal("service", ${JSON.stringify(s).replace(/'/g, "\\'")})'>✏️ Modifier</button>
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
  const { data, error } = await supabaseClient.from('horaires').select('*').order('sort_order');

  const horaires = data && data.length ? data : DAYS.map((d, i) => ({
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
        <label class="toggle" title="Fermé ce jour">
          <input type="checkbox" id="closed-${h.day}" ${h.closed ? 'checked' : ''} onchange="toggleDayRow('${h.day}', this.checked)" />
          <span class="toggle-slider"></span>
        </label>
        <span style="font-size:0.75rem;color:rgba(255,255,255,0.4);">Fermé</span>
      </div>
      <div id="times-${h.day}" style="${h.closed ? 'display:none' : 'display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;'}">
        <div><label>Matin ouvre</label><input type="time" id="mo-${h.day}" value="${h.morning_open || '08:00'}" /></div>
        <div><label>Matin ferme</label><input type="time" id="mc-${h.day}" value="${h.morning_close || '12:00'}" /></div>
        <div><label>A-midi ouvre</label><input type="time" id="ao-${h.day}" value="${h.afternoon_open || '14:00'}" /></div>
        <div><label>A-midi ferme</label><input type="time" id="ac-${h.day}" value="${h.afternoon_close || '17:00'}" /></div>
      </div>`;
    form.appendChild(row);
  });
}

function toggleDayRow(day, closed) {
  const el = document.getElementById(`times-${day}`);
  el.style.display = closed ? 'none' : 'grid';
  el.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
  el.style.gap = '10px';
}

async function saveHoraires() {
  const rows = DAYS.map((day, i) => ({
    day,
    sort_order: i + 1,
    closed: document.getElementById(`closed-${day}`)?.checked ?? false,
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
