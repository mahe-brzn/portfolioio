const supabase = window.supabaseClient;

// State
let currentUser = null;
let currentProfile = null;
let editingSpreadsheetId = null;
let editingItems = [];

// DOM Elements
const views = {
  auth: document.getElementById('view-auth'),
  pending: document.getElementById('view-pending'),
  admin: document.getElementById('view-admin'),
  user: document.getElementById('view-user'),
  edit: document.getElementById('view-edit')
};
const authNavControls = document.getElementById('auth-nav-controls');
const userEmailDisplay = document.getElementById('user-email');

// UI Functions
function showView(viewId) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  views[viewId].classList.add('active');
}

function updateNav() {
  if (currentUser) {
    authNavControls.style.display = 'flex';
    userEmailDisplay.textContent = currentUser.email;
  } else {
    authNavControls.style.display = 'none';
  }
}

// Initialization
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await handleLogin(session.user);
  } else {
    showView('auth');
  }

  // Setup auth state listener
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentProfile = null;
      updateNav();
      showView('auth');
    }
  });
}

async function handleLogin(user) {
  currentUser = user;
  updateNav();
  
  // Fetch profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    console.error("Erreur profile:", error);
    showView('pending');
    return;
  }

  currentProfile = profile;

  if (profile.role === 'admin') {
    showView('admin');
    loadAdminData();
  } else if (profile.role === 'user') {
    showView('user');
    loadUserData();
  } else {
    showView('pending');
  }
}

// ----------------------------------------------------
// AUTHENTICATION
// ----------------------------------------------------
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', (e) => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    e.target.classList.add('active');
    document.getElementById(`form-${e.target.dataset.target}`).classList.add('active');
  });
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = e.target.querySelector('button');
  const err = document.getElementById('login-error');
  
  btn.textContent = 'Chargement...';
  err.textContent = '';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  btn.textContent = 'Se connecter';
  
  if (error) err.textContent = "Erreur: " + error.message;
  else handleLogin(data.user);
});

document.getElementById('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;
  const btn = e.target.querySelector('button');
  const err = document.getElementById('register-error');
  
  btn.textContent = 'Chargement...';
  err.textContent = '';

  const { data, error } = await supabase.auth.signUp({ email, password });
  btn.textContent = 'Créer un compte';
  
  if (error) err.textContent = "Erreur: " + error.message;
  else if (data.user) handleLogin(data.user);
});

document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// ----------------------------------------------------
// ADMIN DASHBOARD
// ----------------------------------------------------
async function loadAdminData() {
  const { data: profiles } = await supabase.from('profiles').select('*');
  const { data: spreadsheets } = await supabase.from('spreadsheets').select('*, profiles(email)');
  
  const pendingList = document.getElementById('pending-users-list');
  const approvedList = document.getElementById('approved-users-list');
  const spreadsheetsList = document.getElementById('all-spreadsheets-list');
  
  pendingList.innerHTML = '';
  approvedList.innerHTML = '';
  spreadsheetsList.innerHTML = '';

  if (profiles) {
    profiles.forEach(p => {
      const el = document.createElement('div');
      el.className = 'list-item';
      if (p.role === 'pending') {
        el.innerHTML = `
          <div><div class="list-item-title">${p.email}</div><div class="badge pending">En attente</div></div>
          <button class="btn-outline" style="padding:4px 10px; font-size:0.75rem;" onclick="approveUser('${p.id}')">Approuver</button>
        `;
        pendingList.appendChild(el);
      } else {
        el.innerHTML = `
          <div><div class="list-item-title">${p.email}</div><div class="badge ${p.role}">${p.role}</div></div>
          ${p.role !== 'admin' ? `<button class="btn-outline" style="padding:4px 10px; font-size:0.75rem; border-color:#ff4b4b; color:#ff4b4b;" onclick="revokeUser('${p.id}')">Révoquer</button>` : ''}
        `;
        approvedList.appendChild(el);
      }
    });
  }

  if (spreadsheets) {
    spreadsheets.forEach(s => {
      const el = document.createElement('div');
      el.className = 'list-item';
      el.innerHTML = `
        <div>
          <div class="list-item-title">${s.title}</div>
          <div class="list-item-sub">/spreadsheet/${s.slug} — par ${s.profiles?.email}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <a href="/spreadsheet/${s.slug}" target="_blank" class="btn-outline" style="padding:4px 10px; font-size:0.75rem;">Voir</a>
          <button class="btn-outline" style="padding:4px 10px; font-size:0.75rem;" onclick="openEditSpreadsheet('${s.id}')">Éditer</button>
        </div>
      `;
      spreadsheetsList.appendChild(el);
    });
  }
}

window.approveUser = async (userId) => {
  await supabase.from('profiles').update({ role: 'user' }).eq('id', userId);
  loadAdminData();
};
window.revokeUser = async (userId) => {
  await supabase.from('profiles').update({ role: 'pending' }).eq('id', userId);
  loadAdminData();
};

// ----------------------------------------------------
// USER DASHBOARD
// ----------------------------------------------------
async function loadUserData() {
  const { data: spreadsheets } = await supabase.from('spreadsheets').select('*').eq('owner_id', currentUser.id);
  const list = document.getElementById('my-spreadsheets-list');
  list.innerHTML = '';

  if (spreadsheets && spreadsheets.length > 0) {
    spreadsheets.forEach(s => {
      const el = document.createElement('div');
      el.className = 'list-item';
      el.innerHTML = `
        <div>
          <div class="list-item-title">${s.title}</div>
          <div class="list-item-sub">/spreadsheet/${s.slug} — ${s.items.length || 0} articles</div>
        </div>
        <div style="display:flex; gap:8px;">
          <a href="/spreadsheet/${s.slug}" target="_blank" class="btn-outline" style="padding:4px 10px; font-size:0.75rem;">Voir</a>
          <button class="btn-outline" style="padding:4px 10px; font-size:0.75rem;" onclick="openEditSpreadsheet('${s.id}')">Éditer</button>
        </div>
      `;
      list.appendChild(el);
    });
  } else {
    list.innerHTML = '<p style="color:var(--text-muted);">Vous n\'avez pas encore créé de spreadsheet.</p>';
  }
}

// ----------------------------------------------------
// CREATE SPREADSHEET
// ----------------------------------------------------
document.getElementById('btn-show-create').addEventListener('click', () => {
  document.getElementById('modal-create').classList.add('active');
});
document.getElementById('btn-close-create').addEventListener('click', () => {
  document.getElementById('modal-create').classList.remove('active');
});

document.getElementById('form-create-spreadsheet').addEventListener('submit', async (e) => {
  e.preventDefault();
  const slug = document.getElementById('create-slug').value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const title = document.getElementById('create-title').value;
  const err = document.getElementById('create-error');
  err.textContent = '';

  const { data, error } = await supabase
    .from('spreadsheets')
    .insert([{ owner_id: currentUser.id, slug, title, items: [] }])
    .select();

  if (error) {
    if (error.code === '23505') err.textContent = "Ce lien existe déjà !";
    else err.textContent = "Erreur: " + error.message;
  } else if (data && data.length > 0) {
    document.getElementById('modal-create').classList.remove('active');
    openEditSpreadsheet(data[0].id);
    if (currentProfile.role === 'admin') loadAdminData();
    else loadUserData();
  }
});

// ----------------------------------------------------
// EDIT SPREADSHEET
// ----------------------------------------------------
window.openEditSpreadsheet = async (id) => {
  editingSpreadsheetId = id;
  const { data: spreadsheet, error } = await supabase.from('spreadsheets').select('*').eq('id', id).single();
  
  if (spreadsheet) {
    editingItems = spreadsheet.items || [];
    document.getElementById('edit-title-display').textContent = spreadsheet.title;
    document.getElementById('edit-url-display').textContent = `mahebrizion.fr/spreadsheet/${spreadsheet.slug}`;
    document.getElementById('edit-url-display').href = `/spreadsheet/${spreadsheet.slug}`;
    
    renderEditItems();
    showView('edit');
  }
};

document.getElementById('btn-back-to-list').addEventListener('click', () => {
  if (currentProfile.role === 'admin') showView('admin');
  else showView('user');
});

document.getElementById('btn-add-item').addEventListener('click', () => {
  editingItems.push({ title: '', price: '', url: '' });
  renderEditItems();
});

function renderEditItems() {
  const container = document.getElementById('items-container');
  container.innerHTML = '';

  if (editingItems.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center;">Aucun article pour le moment. Ajoutez-en un !</p>';
    return;
  }

  editingItems.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'edit-item';
    el.innerHTML = `
      <div>
        <label style="font-size:0.7rem;color:var(--text-muted);">Titre</label>
        <input type="text" value="${item.title.replace(/"/g, '&quot;')}" onchange="updateItem(${index}, 'title', this.value)" placeholder="ex: Nike Dunk Low" />
      </div>
      <div>
        <label style="font-size:0.7rem;color:var(--text-muted);">Prix</label>
        <input type="text" value="${item.price.replace(/"/g, '&quot;')}" onchange="updateItem(${index}, 'price', this.value)" placeholder="ex: 50€" />
      </div>
      <div style="display:flex; align-items:flex-end;">
        <button class="btn-outline" style="border-color:#ff4b4b; color:#ff4b4b; padding:8px;" onclick="deleteItem(${index})">&times;</button>
      </div>
      <div class="edit-item-row2">
        <div style="flex:1;">
          <label style="font-size:0.7rem;color:var(--text-muted);">Lien</label>
          <input type="url" value="${item.url.replace(/"/g, '&quot;')}" onchange="updateItem(${index}, 'url', this.value)" placeholder="https://..." />
        </div>
      </div>
    `;
    container.appendChild(el);
  });
}

window.updateItem = (index, field, value) => {
  editingItems[index][field] = value;
};
window.deleteItem = (index) => {
  editingItems.splice(index, 1);
  renderEditItems();
};

document.getElementById('btn-save-spreadsheet').addEventListener('click', async (e) => {
  const btn = e.target;
  const originalText = btn.textContent;
  btn.textContent = 'Enregistrement...';

  const { error } = await supabase
    .from('spreadsheets')
    .update({ items: editingItems })
    .eq('id', editingSpreadsheetId);

  if (error) {
    alert("Erreur lors de l'enregistrement: " + error.message);
  } else {
    btn.textContent = 'Enregistré !';
    btn.style.background = '#4caf50';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = 'var(--sneaker-accent)';
    }, 2000);
  }
});

// Start the app
document.addEventListener('DOMContentLoaded', init);
