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
  
  // Check 2FA Status
  const { data: factors } = await supabaseClient.auth.mfa.listFactors();
  const has2FA = factors && factors.all && factors.all.some(f => f.status === 'verified');
  
  const btnSec = document.getElementById('btn-security');
  if (btnSec) {
    if (has2FA) {
      btnSec.innerHTML = 'Sécurité <span style="color:#4caf50;">(2FA ✅)</span>';
      btnSec.style.borderColor = '#4caf50';
    } else {
      btnSec.innerHTML = 'Sécurité <span style="color:#ffb74d;">(2FA ❌)</span>';
      btnSec.style.borderColor = '#ffb74d';
    }
    btnSec.dataset.has2fa = has2FA ? 'true' : 'false';
  }
  
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
  
  // Populate API key input if it exists
  const apiKeyInput = document.getElementById('gemini-api-key');
  if (apiKeyInput) {
    apiKeyInput.value = currentProfile.gemini_api_key || localStorage.getItem('gemini_api_key') || '';
  }

  if (profile.role === 'admin') {
    showView('admin');
    loadAdminData();
  } else if (profile.role === 'user' || profile.role === 'creator') {
    showView('user');
    loadUserData();
    
    const btnCreateUser = document.getElementById('btn-show-create');
    if (btnCreateUser) {
      btnCreateUser.style.display = profile.role === 'creator' ? 'inline-block' : 'none';
    }
  } else {
    showView('pending');
  }

  // Handle ?action=create from profile page
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'create' && (profile.role === 'admin' || profile.role === 'creator')) {
    document.getElementById('modal-create').classList.add('active');
    // clean url
    window.history.replaceState({}, document.title, window.location.pathname);
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
    const is2FA = btnSecurity.dataset.has2fa === 'true';
    if (is2FA) {
      document.getElementById('2fa-setup-step1').style.display = 'none';
      document.getElementById('2fa-already-active').style.display = 'block';
    } else {
      document.getElementById('2fa-setup-step1').style.display = 'block';
      document.getElementById('2fa-already-active').style.display = 'none';
    }
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
    
    // Unenroll any existing unverified factors to prevent "already exists" error
    const { data: factors } = await supabaseClient.auth.mfa.listFactors();
    if (factors && factors.all) {
      for (const factor of factors.all) {
        if (factor.status === 'unverified') {
          await supabaseClient.auth.mfa.unenroll({ factorId: factor.id });
        }
      }
    }

    const { data, error } = await supabaseClient.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Portfolio Auth'
    });
    
    btn.textContent = 'Activer la 2FA maintenant';

    if (error) {
      alert("Erreur: " + error.message);
      return;
    }

    console.log('[2FA Enroll] pendingFactorId set to:', data.id);
    pendingFactorId = data.id;
    
    // Display SVG QR Code safely
    const qrContainer = document.getElementById('2fa-qr-code-container');
    qrContainer.innerHTML = ''; // clear previous

    let qrData = data.totp.qr_code;
    
    // Some versions of Supabase return a data URI
    if (qrData.startsWith('data:image')) {
      const img = document.createElement('img');
      img.src = qrData;
      img.style.width = '100%';
      img.style.maxWidth = '250px';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '0 auto';
      qrContainer.appendChild(img);
    } else {
      // Raw SVG string
      qrContainer.innerHTML = qrData;
      const svg = qrContainer.querySelector('svg');
      if (svg) {
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.width = '100%';
        svg.style.height = 'auto';
        svg.style.maxWidth = '250px';
        svg.style.display = 'block';
        svg.style.margin = '0 auto';
      }
    }

    document.getElementById('2fa-setup-step1').style.display = 'none';
    document.getElementById('2fa-setup-step2').style.display = 'block';
  });
}

// Verify Enrollment
const form2faVerify = document.getElementById('form-2fa-verify');
if (form2faVerify) {
  form2faVerify.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('2fa-verify-code').value.trim();
    const err = document.getElementById('2fa-verify-error');
    const btn = e.target.querySelector('button');
    
    btn.textContent = 'Vérification...';
    err.textContent = '';

    console.log('[2FA Verify] pendingFactorId at verify time:', pendingFactorId);
    console.log('[2FA Verify] code entered:', code);
    const { data: challengeData, error: challengeError } = await supabaseClient.auth.mfa.challenge({
      factorId: pendingFactorId
    });
    console.log('[2FA Verify] challengeData:', challengeData, challengeError);

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
      err.textContent = "Code invalide : " + error.message;
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
  const { data: factorsData, error } = await supabaseClient.auth.mfa.listFactors();
  console.log('[2FA Challenge] listFactors result:', factorsData, error);
  
  if (error) {
    console.error("Error listing factors", error);
    return;
  }

  // Supabase returns { all: [], totp: [] }
  const allFactors = factorsData?.all || factorsData?.totp || [];
  const totpFactor = allFactors.find(f => f.factor_type === 'totp' && f.status === 'verified');
  if (!totpFactor) {
    console.error("No verified TOTP factor found. All factors:", allFactors);
    // No 2FA set up yet, go directly to dashboard
    handleLogin(currentUser);
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
  const { data: profiles, error: errProfiles } = await supabaseClient.from('profiles').select('*');
  if (errProfiles) alert("Erreur profils : " + errProfiles.message);
  
  const { data: spreadsheets, error: errSpreadsheets } = await supabaseClient.from('spreadsheets').select('*');
  if (errSpreadsheets) alert("Erreur spreadsheets : " + errSpreadsheets.message);
  
  // Manual join to avoid Supabase PostgREST ambiguity
  if (spreadsheets && profiles) {
    spreadsheets.forEach(s => {
      const ownerProfile = profiles.find(p => p.id === s.owner_id);
      s.profiles = ownerProfile ? { email: ownerProfile.email, display_name: ownerProfile.display_name } : null;
    });
  }
  const adminsList = document.getElementById('admins-list');
  const usersList = document.getElementById('users-list');
  const spreadsheetsList = document.getElementById('all-spreadsheets-list');
  
  if(adminsList) adminsList.innerHTML = '';
  if(usersList) usersList.innerHTML = '';
  if(spreadsheetsList) spreadsheetsList.innerHTML = '';

  if (profiles && adminsList && usersList) {
    profiles.forEach((p, i) => {
      const el = document.createElement('div');
      el.className = 'list-item stagger-item';
      el.style.animationDelay = `${i * 0.05}s`;
      const displayNameStr = p.display_name ? `${p.display_name} <span style="opacity:0.5;font-size:0.8em">(${p.email})</span>` : p.email;
      
      if (p.role === 'admin' || p.role === 'creator') {
        el.innerHTML = `
          <div onclick="openUserDetail('${p.id}')" style="cursor: pointer; flex: 1;"><div class="list-item-title">${displayNameStr}</div><div class="badge ${p.role}">${p.role}</div></div>
          <div style="display:flex; gap:8px;">
            ${p.role !== 'admin' ? `<button class="btn-icon danger" onclick="revokeUser('${p.id}')" title="Rétrograder (User)"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>` : ''}
            ${p.id !== currentUser.id ? `<button class="btn-icon danger" onclick="deleteUser('${p.id}')" title="Supprimer définitivement"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>` : ''}
          </div>
        `;
        adminsList.appendChild(el);
      } else {
        el.innerHTML = `
          <div onclick="openUserDetail('${p.id}')" style="cursor: pointer; flex: 1;"><div class="list-item-title">${displayNameStr}</div><div class="badge ${p.role}">${p.role === 'pending' ? 'En attente' : p.role}</div></div>
          <div style="display:flex; gap:8px;">
            ${p.role === 'pending' ? `<button class="btn-icon" onclick="approveUser('${p.id}')" title="Approuver"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg></button>` : ''}
            ${p.role === 'user' ? `<button class="btn-icon" onclick="promoteToCreator('${p.id}')" title="Promouvoir Créateur" style="color:#c8ff57; border-color:#c8ff57;"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 20V10"></path><path d="M18 20V4"></path><path d="M6 20v-4"></path></svg></button>` : ''}
            ${p.id !== currentUser.id ? `<button class="btn-icon danger" onclick="deleteUser('${p.id}')" title="Supprimer définitivement"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>` : ''}
          </div>
        `;
        usersList.appendChild(el);
      }
    });
  }

  if (spreadsheets && spreadsheetsList) {
    if (spreadsheets.length === 0) {
      spreadsheetsList.innerHTML = '<p style="color:var(--text-muted); padding: 10px;">Aucune spreadsheet trouvée.</p>';
    } else {
      spreadsheets.forEach((s, i) => {
      const el = document.createElement('div');
      el.className = 'list-item stagger-item';
      el.style.animationDelay = `${i * 0.05}s`;
      el.innerHTML = `
        <div>
          <div class="list-item-title">${s.title}</div>
          <div class="list-item-sub">/spreadsheet/${s.slug} — par ${s.profiles?.display_name || s.profiles?.email}</div>
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
}

window.approveUser = async (userId) => {
  await supabaseClient.from('profiles').update({ role: 'user' }).eq('id', userId);
  loadAdminData();
};
window.promoteToCreator = async (userId) => {
  const { error } = await supabaseClient.from('profiles').update({ role: 'creator' }).eq('id', userId);
  if (error) {
    alert("Erreur lors de la promotion : " + error.message + "\n\nSi vous voyez une erreur de type (enum), vous devez exécuter le script SQL fourni dans Supabase.");
    console.error(error);
  }
  loadAdminData();
};
window.revokeUser = async (userId) => {
  await supabaseClient.from('profiles').update({ role: 'pending' }).eq('id', userId);
  loadAdminData();
};

let currentUserDetailId = null;

window.openUserDetail = async (userId) => {
  currentUserDetailId = userId;
  const modal = document.getElementById('modal-user-detail');
  
  // Find user data
  const { data: userProfile } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
  if (!userProfile) return;

  document.getElementById('detail-user-email').textContent = userProfile.email;
  document.getElementById('detail-user-name').textContent = userProfile.display_name || 'Aucun pseudo';
  document.getElementById('detail-user-role').value = userProfile.role;
  document.getElementById('detail-role-status').textContent = '';

  // Find user spreadsheets
  const { data: userSheets } = await supabaseClient.from('spreadsheets').select('*').eq('owner_id', userId);
  const sheetsContainer = document.getElementById('detail-user-spreadsheets');
  
  if (userSheets && userSheets.length > 0) {
    sheetsContainer.innerHTML = userSheets.map(s => `
      <div class="list-item" style="padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px; margin-bottom: 8px;">
        <div style="font-weight: 600;">${s.title}</div>
        <div style="font-size: 0.8rem; opacity: 0.6;">/spreadsheet/${s.slug}</div>
      </div>
    `).join('');
  } else {
    sheetsContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Aucune spreadsheet.</p>';
  }

  modal.classList.add('active');
};

document.getElementById('btn-close-user-detail')?.addEventListener('click', () => {
  document.getElementById('modal-user-detail').classList.remove('active');
});

document.getElementById('btn-save-user-role')?.addEventListener('click', async () => {
  if (!currentUserDetailId) return;
  const newRole = document.getElementById('detail-user-role').value;
  const statusEl = document.getElementById('detail-role-status');
  statusEl.textContent = 'Enregistrement...';
  
  const { error } = await supabaseClient.from('profiles').update({ role: newRole }).eq('id', currentUserDetailId);
  if (error) {
    statusEl.textContent = "Erreur: " + error.message;
    alert("Erreur détaillée : " + error.message + "\nSi c'est une erreur de type (enum ou contrainte), exécutez le script SQL fourni.");
  } else {
    statusEl.textContent = "Rôle mis à jour avec succès.";
    setTimeout(() => {
      document.getElementById('modal-user-detail').classList.remove('active');
      loadAdminData();
    }, 1000);
  }
});

document.getElementById('search-users')?.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const lists = [document.getElementById('users-list')];
  
  lists.forEach(list => {
    if(!list) return;
    Array.from(list.children).forEach(child => {
      const text = child.textContent.toLowerCase();
      child.style.display = text.includes(term) ? 'flex' : 'none';
    });
  });
});

document.getElementById('search-admins')?.addEventListener('input', (e) => {
  const term = e.target.value.toLowerCase();
  const lists = [document.getElementById('admins-list')];
  
  lists.forEach(list => {
    if(!list) return;
    Array.from(list.children).forEach(child => {
      const text = child.textContent.toLowerCase();
      child.style.display = text.includes(term) ? 'flex' : 'none';
    });
  });
});

window.deleteUser = async (userId) => {
  if (confirm("⚠️ ATTENTION : Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?\n\nToutes ses spreadsheets seront également supprimées de façon irréversible.")) {
    const { error } = await supabaseClient.rpc('delete_user_admin', { target_user_id: userId });
    if (error) {
      alert("Erreur lors de la suppression : " + error.message);
    } else {
      loadAdminData();
    }
  }
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
  const btnGenDesc = document.getElementById('btn-generate-desc');
  if (btnGenDesc) {
    btnGenDesc.style.display = currentProfile?.gemini_api_key ? 'inline-block' : 'none';
  }
});

document.getElementById('btn-show-create-admin')?.addEventListener('click', () => {
  document.getElementById('modal-create').classList.add('active');
  const btnGenDesc = document.getElementById('btn-generate-desc');
  if (btnGenDesc) {
    btnGenDesc.style.display = currentProfile?.gemini_api_key ? 'inline-block' : 'none';
  }
});

document.getElementById('btn-generate-desc')?.addEventListener('click', async () => {
  const title = document.getElementById('create-title').value.trim();
  if (!title) {
    alert("Veuillez d'abord entrer un Titre pour la spreadsheet !");
    return;
  }
  
  const apiKey = currentProfile?.gemini_api_key;
  if (!apiKey) return;
  
  const btn = document.getElementById('btn-generate-desc');
  btn.textContent = 'Génération...';
  
  try {
    const prompt = `Génère une très courte description marketing (1 ou 2 phrases max) pour une collection de produits intitulée "${title}". Le ton doit être vendeur, moderne et stylé, en français. Ne mets pas de guillemets autour.`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    });
    
    const data = await response.json();
    if (data.candidates && data.candidates.length > 0) {
      let desc = data.candidates[0].content.parts[0].text.trim();
      document.getElementById('create-desc').value = desc;
    } else {
      alert("Erreur lors de la génération avec l'IA.");
    }
  } catch (err) {
    console.error("Gemini API Error", err);
    alert("Erreur de connexion à l'API Gemini.");
  }
  btn.textContent = '✨ Générer par IA';
});
document.getElementById('btn-close-create')?.addEventListener('click', () => {
  document.getElementById('modal-create').classList.remove('active');
});

document.getElementById('form-create-spreadsheet')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const slug = document.getElementById('create-slug').value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const title = document.getElementById('create-title').value;
  const badge_text = document.getElementById('create-badge').value || 'La sélection du chef';
  const description = document.getElementById('create-desc').value || 'Une sélection exclusive de sneakers, claquettes et sacs à dos au meilleur prix.';
  const accent_color = document.getElementById('create-color').value;
  const err = document.getElementById('create-error');
  err.textContent = '';

  const { data, error } = await supabaseClient
    .from('spreadsheets')
    .insert([{ owner_id: currentUser.id, slug, title, items: [], accent_color, badge_text, description }])
    .select();

  if (error) {
    if (error.code === '23505') err.textContent = "Ce lien existe déjà !";
    else err.textContent = "Erreur: " + error.message;
  } else if (data && data.length > 0) {
    document.getElementById('modal-create').classList.remove('active');
    openEditSpreadsheet(data[0].id);
    if (currentProfile.role === 'admin') loadAdminData();
    else if (currentProfile.role === 'creator') loadUserData();
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
    
    const badgeInput = document.getElementById('edit-badge');
    if (badgeInput) badgeInput.value = spreadsheet.badge_text || '';
    
    const descInput = document.getElementById('edit-desc');
    if (descInput) descInput.value = spreadsheet.description || '';
    
    const colorInput = document.getElementById('edit-color');
    if (colorInput) colorInput.value = spreadsheet.accent_color || '#c8ff57';
    
    const visibilitySelect = document.getElementById('edit-visibility');
    if (visibilitySelect) visibilitySelect.value = spreadsheet.visibility || 'public';
    
    // Permissions logic
    const permPanel = document.getElementById('edit-owner')?.closest('.admin-card');
    if (currentProfile.role === 'admin') {
      if (permPanel) permPanel.style.display = 'block';
      const { data: profiles } = await supabaseClient.from('profiles').select('*').in('role', ['user', 'admin']);
      const ownerSelect = document.getElementById('edit-owner');
      const editorsList = document.getElementById('edit-editors-list');
      
      if (ownerSelect && editorsList && profiles) {
        ownerSelect.innerHTML = '';
        editorsList.innerHTML = '';
        
        profiles.forEach(p => {
          // Owner option
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.email;
          if (p.id === spreadsheet.owner_id) opt.selected = true;
          ownerSelect.appendChild(opt);
          
          // Editor checkbox
          if (p.id !== spreadsheet.owner_id) {
            const isEditor = (spreadsheet.editors || []).includes(p.id);
            const div = document.createElement('div');
            div.innerHTML = `
              <label style="display:flex; align-items:center; gap:10px; cursor:pointer;">
                <input type="checkbox" value="${p.id}" class="editor-checkbox" ${isEditor ? 'checked' : ''} />
                <span style="color:var(--white); font-size:0.9rem;">${p.email}</span>
              </label>
            `;
            editorsList.appendChild(div);
          }
        });
      }
    } else {
      if (permPanel) permPanel.style.display = 'none';
    }
    renderEditItems();
    loadSuggestions(id);
    showView('edit');
  }
};

async function loadSuggestions(spreadsheetId) {
  const container = document.getElementById('suggestions-list');
  if (!container) return;
  
  const { data: suggestions, error } = await supabaseClient.from('suggestions').select('*, profiles(email)').eq('spreadsheet_id', spreadsheetId).eq('status', 'pending');
  
  if (error) {
    container.innerHTML = '<p style="color:red;">Erreur lors du chargement des suggestions.</p>';
    return;
  }
  
  if (!suggestions || suggestions.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);">Aucune suggestion en attente.</p>';
    return;
  }
  
  container.innerHTML = '';
  suggestions.forEach(s => {
    const author = s.profiles?.email ? s.profiles.email.split('@')[0] : 'Inconnu';
    container.innerHTML += `
      <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h4 style="margin:0 0 5px 0;">${s.title} <span style="font-size:0.8rem; color:var(--text-muted); font-weight:normal;">par ${author}</span></h4>
          <p style="margin:0; font-size:0.85rem; color:rgba(255,255,255,0.7);"><a href="${s.url}" target="_blank" style="color:var(--sneaker-accent);">${s.url}</a> — ${s.price || 'Pas de prix'}</p>
          ${s.note ? `<p style="margin:5px 0 0 0; font-size:0.85rem; font-style:italic;">"${s.note}"</p>` : ''}
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-icon" onclick="approveSuggestion('${s.id}', \`${s.title}\`, \`${s.url}\`, \`${s.price}\`)" style="color:#c8ff57; border-color:#c8ff57;" title="Accepter et ajouter"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg></button>
          <button class="btn-icon danger" onclick="rejectSuggestion('${s.id}')" title="Rejeter"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
        </div>
      </div>
    `;
  });
}

window.approveSuggestion = async (id, title, url, price) => {
  // Append to items
  editingItems.push({ title: title, price: price || '', url: url, keywords: '' });
  renderEditItems();
  
  // Mark as approved in DB
  await supabaseClient.from('suggestions').update({ status: 'approved' }).eq('id', id);
  loadSuggestions(editingSpreadsheetId);
};

window.rejectSuggestion = async (id) => {
  if (!confirm("Voulez-vous rejeter cette suggestion ?")) return;
  await supabaseClient.from('suggestions').update({ status: 'rejected' }).eq('id', id);
  loadSuggestions(editingSpreadsheetId);
};

document.getElementById('btn-back-to-list')?.addEventListener('click', () => {
  if (currentProfile.role === 'admin') showView('admin');
  else if (currentProfile.role === 'creator' || currentProfile.role === 'user') showView('user');
});

document.getElementById('btn-add-item')?.addEventListener('click', () => {
  editingItems.push({ title: '', price: '', url: '', keywords: '', weight: '', shipping_cost: '' });
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
      <div style="display:grid; grid-template-columns: 2fr 1fr auto; gap:10px; margin-bottom:10px;">
        <div>
          <label style="font-size:0.7rem;color:var(--text-muted);">Titre</label>
          <input type="text" value="${(item.title || '').replace(/"/g, '&quot;')}" onchange="updateItem(${index}, 'title', this.value)" placeholder="ex: Nike Dunk Low" />
        </div>
        <div>
          <label style="font-size:0.7rem;color:var(--text-muted);">Prix</label>
          <input type="text" value="${(item.price || '').replace(/"/g, '&quot;')}" onchange="updateItem(${index}, 'price', this.value)" placeholder="ex: 50€" />
        </div>
        <div style="display:flex; align-items:flex-end;">
          <button class="btn-icon danger" onclick="deleteItem(${index})" title="Supprimer"><svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
        </div>
      </div>
      
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:10px;">
        <div style="position:relative;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <label style="font-size:0.7rem;color:var(--text-muted);">Poids estimé</label>
            <button onclick="generateShipping(${index})" class="btn-add-ghost" style="padding: 2px 8px; font-size: 0.7rem; margin-bottom: 2px;">✨ Estimer Livraison</button>
          </div>
          <input type="text" id="weight-input-${index}" value="${(item.weight || '').replace(/"/g, '&quot;')}" onchange="updateItem(${index}, 'weight', this.value)" placeholder="ex: ~800g estimé" />
        </div>
        <div>
          <label style="font-size:0.7rem;color:var(--text-muted);">Coût Livraison</label>
          <input type="text" id="shipping-input-${index}" value="${(item.shipping_cost || '').replace(/"/g, '&quot;')}" onchange="updateItem(${index}, 'shipping_cost', this.value)" placeholder="ex: ~15–25€ livraison" />
        </div>
      </div>

      <div class="edit-item-row2">
        <div style="flex:1;">
          <label style="font-size:0.7rem;color:var(--text-muted);">Lien (URL Originale pure)</label>
          <input type="url" value="${(item.url || '').replace(/"/g, '&quot;')}" onchange="updateUrlItem(${index}, this.value)" placeholder="https://weidian.com/..." />
        </div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <label style="font-size:0.7rem;color:var(--text-muted);">Mots-clés</label>
            <button onclick="generateKeywords(${index})" class="btn-add-ghost" style="padding: 2px 8px; font-size: 0.7rem; margin-bottom: 2px;">✨ Générer</button>
          </div>
          <input type="text" id="kw-input-${index}" value="${(item.keywords || '').replace(/"/g, '&quot;')}" onchange="updateItem(${index}, 'keywords', this.value)" placeholder="ex: LV, sneaker..." />
        </div>
      </div>
    `;
    container.appendChild(el);
  });
}

window.updateUrlItem = (index, value) => {
  let finalUrl = value;
  // Extract original URL from agent links if possible
  try {
    if (value.includes('url=') || value.includes('productLink=')) {
      const urlObj = new URL(value);
      const extracted = urlObj.searchParams.get('url') || urlObj.searchParams.get('productLink');
      if (extracted) {
        // Decode it in case it's encoded
        finalUrl = decodeURIComponent(extracted);
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  updateItem(index, 'url', finalUrl);
  // Re-render to show the cleaned URL
  renderEditItems();
};

window.updateItem = (index, field, value) => {
  editingItems[index][field] = value;
};
window.deleteItem = (index) => {
  editingItems.splice(index, 1);
  renderEditItems();
};

window.generateKeywords = async (index) => {
  const apiKey = currentProfile?.gemini_api_key || localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    alert("Veuillez d'abord configurer votre clé API Gemini en bas de la page.");
    return;
  }
  
  const item = editingItems[index];
  if (!item.title || item.title.trim() === '') {
    alert("Veuillez d'abord entrer un titre pour cet article.");
    return;
  }

  const inputEl = document.getElementById(`kw-input-${index}`);
  const originalPlaceholder = inputEl.placeholder;
  inputEl.value = "Génération en cours...";
  inputEl.disabled = true;

  const prompt = `Tu es un expert en sneakers et en streetwear. Génère une liste de mots-clés de recherche (abréviations, marque, surnoms, catégories, fautes de frappe courantes) pour la chaussure suivante : "${item.title}". Règles: Ne renvoie STRICTEMENT rien d'autre que la liste des mots-clés séparés par des virgules. Maximum 30 mots-clés. Tout en minuscules.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data.error && data.error.message) ? data.error.message : "Erreur inconnue de l'API Gemini.");
    }
    let keywords = data.candidates[0].content.parts[0].text.trim();
    // Remove any trailing period if AI added one
    if (keywords.endsWith('.')) keywords = keywords.slice(0, -1);
    
    editingItems[index].keywords = keywords;
    inputEl.value = keywords;
  } catch (err) {
    alert(err.message);
    inputEl.value = item.keywords || '';
  } finally {
    inputEl.disabled = false;
  }
};

window.generateShipping = async (index) => {
  const apiKey = currentProfile?.gemini_api_key || localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    alert("Veuillez d'abord configurer votre clé API Gemini en bas de la page.");
    return;
  }
  
  const item = editingItems[index];
  if (!item.title || item.title.trim() === '') {
    alert("Veuillez d'abord entrer un titre pour cet article.");
    return;
  }

  const weightInput = document.getElementById(`weight-input-${index}`);
  const shippingInput = document.getElementById(`shipping-input-${index}`);
  weightInput.value = "Calcul...";
  shippingInput.value = "Calcul...";

  const prompt = `Tu es un expert en sneakers et streetwear importés de Chine (notamment des répliques/contrefaçons). Je dois estimer le poids avec la boîte et le coût de livraison vers l'Europe via un agent (ex: Sugargoo, CNFans).
  Article : "${item.title}".
  Règles : 
  - Renvoie uniquement 2 lignes.
  - Ligne 1 : poids (ex: "~1200g estimé")
  - Ligne 2 : coût livraison (ex: "~20-30€ livraison")
  Ne dis rien d'autre.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error((data.error && data.error.message) ? data.error.message : "Erreur inconnue de l'API Gemini.");
    }
    const lines = data.candidates[0].content.parts[0].text.trim().split('\n');
    const weight = lines[0] ? lines[0].trim() : '~800g estimé';
    const shipping = lines[1] ? lines[1].trim() : '~15-25€ livraison';
    
    editingItems[index].weight = weight;
    editingItems[index].shipping_cost = shipping;
    weightInput.value = weight;
    shippingInput.value = shipping;
  } catch (err) {
    alert(err.message);
    weightInput.value = item.weight || '';
    shippingInput.value = item.shipping_cost || '';
  }
};

// AI Settings Logic
const apiKeyInput = document.getElementById('gemini-api-key');
const saveKeyBtn = document.getElementById('btn-save-api-key');
const keyStatus = document.getElementById('api-key-status');

if (apiKeyInput && saveKeyBtn) {
  saveKeyBtn.addEventListener('click', async () => {
    const val = apiKeyInput.value.trim();
    const originalText = saveKeyBtn.textContent;
    saveKeyBtn.textContent = '...';
    
    if (val) {
      localStorage.setItem('gemini_api_key', val); // Backup
      
      // Save to Supabase
      if (currentProfile && currentUser) {
        await supabaseClient
          .from('profiles')
          .update({ gemini_api_key: val })
          .eq('id', currentUser.id);
        currentProfile.gemini_api_key = val;
      }

      keyStatus.style.display = 'block';
      setTimeout(() => keyStatus.style.display = 'none', 3000);
    } else {
      localStorage.removeItem('gemini_api_key');
      if (currentProfile && currentUser) {
        await supabaseClient
          .from('profiles')
          .update({ gemini_api_key: null })
          .eq('id', currentUser.id);
        currentProfile.gemini_api_key = null;
      }
    }
    saveKeyBtn.textContent = originalText;
  });
}

document.getElementById('btn-save-spreadsheet')?.addEventListener('click', async (e) => {
  const btn = e.target;
  const originalText = btn.textContent;
  btn.textContent = 'Enregistrement...';
  const updateData = { 
    items: editingItems, 
    accent_color: document.getElementById('edit-color') ? document.getElementById('edit-color').value : undefined, 
    badge_text: document.getElementById('edit-badge') ? document.getElementById('edit-badge').value : undefined, 
    description: document.getElementById('edit-desc') ? document.getElementById('edit-desc').value : undefined,
    visibility: document.getElementById('edit-visibility') ? document.getElementById('edit-visibility').value : 'public'
  };

  if (currentProfile.role === 'admin') {
    const ownerSelect = document.getElementById('edit-owner');
    if (ownerSelect && ownerSelect.value) {
      updateData.owner_id = ownerSelect.value;
    }
    
    const editorCheckboxes = document.querySelectorAll('.editor-checkbox:checked');
    const editors = Array.from(editorCheckboxes).map(cb => cb.value);
    updateData.editors = editors;
  }

  const { error } = await supabaseClient
    .from('spreadsheets')
    .update(updateData)
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
