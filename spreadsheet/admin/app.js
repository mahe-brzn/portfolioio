const supabaseClient = window.supabaseClient;

// State
let currentUser = null;
let currentProfile = null;
let editingSpreadsheetId = null;
let editingItems = [];
let pendingFactorId = null;
let pendingChallengeId = null;

// DOM Elements
const views = {
  auth: document.getElementById('view-auth'),
  '2fa-challenge': document.getElementById('view-2fa-challenge'),
  '2fa-setup': document.getElementById('view-2fa-setup'),
  pending: document.getElementById('view-pending'),
  admin: document.getElementById('view-admin'),
  user: document.getElementById('view-user'),
  edit: document.getElementById('view-edit')
};
const authNavControls = document.getElementById('auth-nav-controls');
const userEmailDisplay = document.getElementById('user-email');

// UI Functions
function showView(viewId) {
  Object.values(views).forEach(v => {
    if (v) v.classList.remove('active');
  });
  if(views[viewId]) views[viewId].classList.add('active');
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
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    await handleLogin(session.user);
  } else {
    showView('auth');
  }

  // Setup auth state listener
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
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
  
  // Check 2FA Assurance Level
  const { data: aal, error: aalError } = await supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalError) {
    console.error("AAL Error:", aalError);
  } else if (aal.nextLevel === 'aal2' && aal.currentLevel === 'aal1') {
    // Requires 2FA Challenge
    updateNav(); // show nav so user can see they are partially logged in
    start2FAChallenge();
    return;
  }

  updateNav();
  
  // Fetch profile
  const { data: profile, error } = await supabaseClient
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

document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = e.target.querySelector('button');
  const err = document.getElementById('login-error');
  
  btn.textContent = 'Chargement...';
  err.textContent = '';

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  btn.textContent = 'Se connecter';
  
  if (error) {
    err.textContent = "Erreur: " + error.message;
    alert("Erreur de connexion : " + error.message);
  }
  else handleLogin(data.user);
});

// Request Access Flow
const btnShowReq = document.getElementById('btn-show-request-access');
if (btnShowReq) {
  btnShowReq.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('modal-req-access').classList.add('active');
  });
}

const btnCloseReq = document.getElementById('btn-close-req');
if (btnCloseReq) {
  btnCloseReq.addEventListener('click', () => {
    document.getElementById('modal-req-access').classList.remove('active');
  });
}

const formReq = document.getElementById('form-req-access');
if (formReq) {
  formReq.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = encodeURIComponent(document.getElementById('req-email').value);
    const msg = encodeURIComponent(document.getElementById('req-msg').value);
    const subject = encodeURIComponent("Demande d'accès Admin Spreadsheets");
    const body = `Email demandeur: ${email}%0D%0A%0D%0AMessage:%0D%0A${msg}`;
    
    window.location.href = `mailto:spreadsheet@mahebrizion.fr?subject=${subject}&body=${body}`;
    document.getElementById('modal-req-access').classList.remove('active');
  });
}

document.getElementById('btn-logout').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
});

// ----------------------------------------------------
// 2FA LOGIC (MFA)
// ----------------------------------------------------
const btnSecurity = document.getElementById('btn-security');
if (btnSecurity) {
  btnSecurity.addEventListener('click', () => {
    document.getElementById('2fa-setup-step1').style.display = 'block';
    document.getElementById('2fa-setup-step2').style.display = 'none';
    document.getElementById('2fa-setup-success').style.display = 'none';
    showView('2fa-setup');
  });
}

const btnBack2fa = document.getElementById('btn-back-from-2fa');
if (btnBack2fa) {
  btnBack2fa.addEventListener('click', () => {
    handleLogin(currentUser);
  });
}

// Start Enrollment
const btnStart2fa = document.getElementById('btn-start-2fa');
if (btnStart2fa) {
  btnStart2fa.addEventListener('click', async () => {
    const btn = document.getElementById('btn-start-2fa');
    btn.textContent = 'Génération du QR Code...';
    
    const { data, error } = await supabaseClient.auth.mfa.enroll({
      factorType: 'totp'
    });
    
    btn.textContent = 'Activer la 2FA maintenant';

    if (error) {
      alert("Erreur: " + error.message);
      return;
    }

    pendingFactorId = data.id;
    
    // Display SVG QR Code
    const qrContainer = document.getElementById('2fa-qr-code-container');
    qrContainer.innerHTML = data.totp.qr_code;
    qrContainer.querySelector('svg').style.width = '200px';
    qrContainer.querySelector('svg').style.height = '200px';

    document.getElementById('2fa-setup-step1').style.display = 'none';
    document.getElementById('2fa-setup-step2').style.display = 'block';
  });
}

// Verify Enrollment
const form2faVerify = document.getElementById('form-2fa-verify');
if (form2faVerify) {
  form2faVerify.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('2fa-verify-code').value;
    const err = document.getElementById('2fa-verify-error');
    const btn = e.target.querySelector('button');
    
    btn.textContent = 'Vérification...';
    err.textContent = '';

    const { data: challengeData, error: challengeError } = await supabaseClient.auth.mfa.challenge({
      factorId: pendingFactorId
    });

    if (challengeError) {
      err.textContent = "Erreur challenge: " + challengeError.message;
      btn.textContent = 'Vérifier et Activer';
      return;
    }

    const { data, error } = await supabaseClient.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: challengeData.id,
      code: code
    });

    btn.textContent = 'Vérifier et Activer';

    if (error) {
      err.textContent = "Code invalide. Essayez encore.";
    } else {
      document.getElementById('2fa-setup-step2').style.display = 'none';
      document.getElementById('2fa-setup-success').style.display = 'block';
      setTimeout(() => {
        handleLogin(currentUser); // re-trigger login flow to show correct dashboard
      }, 2000);
    }
  });
}

// Start Challenge (Login)
async function start2FAChallenge() {
  showView('2fa-challenge');
  const { data: { factors }, error } = await supabaseClient.auth.mfa.listFactors();
  
  if (error) {
    console.error("Error listing factors", error);
    return;
  }

  const totpFactor = factors.find(f => f.factor_type === 'totp' && f.status === 'verified');
  if (!totpFactor) {
    console.error("No verified TOTP factor found");
    return;
  }

  pendingFactorId = totpFactor.id;

  const { data, error: challengeError } = await supabaseClient.auth.mfa.challenge({
    factorId: pendingFactorId
  });

  if (challengeError) {
    console.error("Challenge error", challengeError);
    return;
  }

  pendingChallengeId = data.id;
}

// Verify Challenge (Login)
const form2faChallenge = document.getElementById('form-2fa-challenge');
if (form2faChallenge) {
  form2faChallenge.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('2fa-challenge-code').value;
    const err = document.getElementById('2fa-challenge-error');
    const btn = e.target.querySelector('button');
    
    btn.textContent = 'Vérification...';
    err.textContent = '';

    const { data, error } = await supabaseClient.auth.mfa.verify({
      factorId: pendingFactorId,
      challengeId: pendingChallengeId,
      code: code
    });

    btn.textContent = 'Valider';

    if (error) {
      err.textContent = "Code invalide.";
    } else {
      // 2FA successful! proceed to dashboard
      handleLogin(currentUser);
    }
  });
}


// ----------------------------------------------------
// ADMIN DASHBOARD
// ----------------------------------------------------
async function loadAdminData() {
  const { data: profiles } = await supabaseClient.from('profiles').select('*');
  const { data: spreadsheets } = await supabaseClient.from('spreadsheets').select('*, profiles(email)');
  
  const pendingList = document.getElementById('pending-users-list');
  const approvedList = document.getElementById('approved-users-list');
  const spreadsheetsList = document.getElementById('all-spreadsheets-list');
  
  if(pendingList) pendingList.innerHTML = '';
  if(approvedList) approvedList.innerHTML = '';
  if(spreadsheetsList) spreadsheetsList.innerHTML = '';

  if (profiles && pendingList && approvedList) {
    profiles.forEach((p, i) => {
      const el = document.createElement('div');
      el.className = 'list-item stagger-item';
      el.style.animationDelay = `${i * 0.05}s`;
      if (p.role === 'pending') {
        el.innerHTML = `
          <div><div class="list-item-title">${p.email}</div><div class="badge pending">En attente</div></div>
          <button class="btn-icon" onclick="approveUser('${p.id}')" title="Approuver"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
        `;
        pendingList.appendChild(el);
      } else {
        el.innerHTML = `
          <div><div class="list-item-title">${p.email}</div><div class="badge ${p.role}">${p.role}</div></div>
          ${p.role !== 'admin' ? `<button class="btn-icon danger" onclick="revokeUser('${p.id}')" title="Révoquer"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>` : ''}
        `;
        approvedList.appendChild(el);
      }
    });
  }

  if (spreadsheets && spreadsheetsList) {
    spreadsheets.forEach((s, i) => {
      const el = document.createElement('div');
      el.className = 'list-item stagger-item';
      el.style.animationDelay = `${i * 0.05}s`;
      el.innerHTML = `
        <div>
          <div class="list-item-title">${s.title}</div>
          <div class="list-item-sub">/spreadsheet/${s.slug} — par ${s.profiles?.email}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <a href="/spreadsheet/${s.slug}" target="_blank" class="btn-icon" title="Voir"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>
          <button class="btn-icon" onclick="openEditSpreadsheet('${s.id}')" title="Éditer"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
        </div>
      `;
      spreadsheetsList.appendChild(el);
    });
  }
}

window.approveUser = async (userId) => {
  await supabaseClient.from('profiles').update({ role: 'user' }).eq('id', userId);
  loadAdminData();
};
window.revokeUser = async (userId) => {
  await supabaseClient.from('profiles').update({ role: 'pending' }).eq('id', userId);
  loadAdminData();
};

// ----------------------------------------------------
// USER DASHBOARD
// ----------------------------------------------------
async function loadUserData() {
  const { data: spreadsheets } = await supabaseClient.from('spreadsheets').select('*').eq('owner_id', currentUser.id);
  const list = document.getElementById('my-spreadsheets-list');
  if(!list) return;
  list.innerHTML = '';

  if (spreadsheets && spreadsheets.length > 0) {
    spreadsheets.forEach((s, i) => {
      const el = document.createElement('div');
      el.className = 'list-item stagger-item';
      el.style.animationDelay = `${i * 0.05}s`;
      el.innerHTML = `
        <div>
          <div class="list-item-title">${s.title}</div>
          <div class="list-item-sub">/spreadsheet/${s.slug} — ${s.items?.length || 0} articles</div>
        </div>
        <div style="display:flex; gap:8px;">
          <a href="/spreadsheet/${s.slug}" target="_blank" class="btn-icon" title="Voir"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a>
          <button class="btn-icon" onclick="openEditSpreadsheet('${s.id}')" title="Éditer"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
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
document.getElementById('btn-show-create')?.addEventListener('click', () => {
  document.getElementById('modal-create').classList.add('active');
});
document.getElementById('btn-close-create')?.addEventListener('click', () => {
  document.getElementById('modal-create').classList.remove('active');
});

document.getElementById('form-create-spreadsheet')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const slug = document.getElementById('create-slug').value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const title = document.getElementById('create-title').value;
  const err = document.getElementById('create-error');
  err.textContent = '';

  const { data, error } = await supabaseClient
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
  const { data: spreadsheet, error } = await supabaseClient.from('spreadsheets').select('*').eq('id', id).single();
  
  if (spreadsheet) {
    editingItems = spreadsheet.items || [];
    document.getElementById('edit-title-display').textContent = spreadsheet.title;
    document.getElementById('edit-url-display').textContent = `mahebrizion.fr/spreadsheet/${spreadsheet.slug}`;
    document.getElementById('edit-url-display').href = `/spreadsheet/${spreadsheet.slug}`;
    
    renderEditItems();
    showView('edit');
  }
};

document.getElementById('btn-back-to-list')?.addEventListener('click', () => {
  if (currentProfile.role === 'admin') showView('admin');
  else showView('user');
});

document.getElementById('btn-add-item')?.addEventListener('click', () => {
  editingItems.push({ title: '', price: '', url: '' });
  renderEditItems();
});

function renderEditItems() {
  const container = document.getElementById('items-container');
  if(!container) return;
  container.innerHTML = '';

  if (editingItems.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center;">Aucun article pour le moment. Ajoutez-en un !</p>';
    return;
  }

  editingItems.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'edit-item stagger-item';
    el.style.animationDelay = `${index * 0.05}s`;
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
        <button class="btn-icon danger" onclick="deleteItem(${index})" title="Supprimer"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
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

document.getElementById('btn-save-spreadsheet')?.addEventListener('click', async (e) => {
  const btn = e.target;
  const originalText = btn.textContent;
  btn.textContent = 'Enregistrement...';

  const { error } = await supabaseClient
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

// ----------------------------------------------------
// ADMIN EXTRA HANDLERS
// ----------------------------------------------------
document.getElementById('btn-show-create-admin')?.addEventListener('click', () => {
  document.getElementById('modal-create').classList.add('active');
});

document.getElementById('btn-show-create-user')?.addEventListener('click', () => {
  document.getElementById('modal-create-user').classList.add('active');
});

document.getElementById('btn-close-create-user')?.addEventListener('click', () => {
  document.getElementById('modal-create-user').classList.remove('active');
});

document.getElementById('form-create-user')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.innerHTML = 'Création...';
  
  const email = document.getElementById('new-user-email').value;
  const password = document.getElementById('new-user-password').value;
  
  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    alert("Erreur: " + error.message);
    btn.innerHTML = 'Créer le compte';
  } else {
    alert("Utilisateur créé ! Vous avez été déconnecté (sécurité Supabase). Veuillez vous reconnecter.");
    window.location.reload();
  }
});
