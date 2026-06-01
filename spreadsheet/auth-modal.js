// spreadsheet/auth-modal.js
(async function() {
  const supabase = window.supabaseClient;
  if (!supabase) return;

  // 1. Inject HTML Modal & CSS
  const style = document.createElement('style');
  style.innerHTML = `
    .auth-modal-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
      z-index: 10000; display: none; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.3s;
    }
    .auth-modal-overlay.active { display: flex; opacity: 1; }
    .auth-modal {
      background: rgba(18, 18, 24, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;
      padding: 40px; width: 90%; max-width: 420px;
      transform: translateY(20px); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }
    .auth-modal-overlay.active .auth-modal { transform: translateY(0); }
    .auth-tabs { display: flex; margin-bottom: 25px; background: rgba(255,255,255,0.03); border-radius: 12px; padding: 5px; }
    .auth-tab { flex: 1; text-align: center; padding: 12px; cursor: pointer; color: rgba(255,255,255,0.5); border-radius: 8px; font-weight: 500; transition: 0.3s; }
    .auth-tab.active { background: rgba(255,255,255,0.1); color: #fff; }
    .auth-input { width: 100%; padding: 14px; margin-bottom: 15px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 10px; font-family: inherit; transition: border-color 0.3s; }
    .auth-input:focus { outline: none; border-color: var(--sneaker-accent, #c8ff57); }
    .auth-btn { width: 100%; padding: 14px; background: var(--sneaker-accent, #c8ff57); color: #000; font-weight: bold; border: none; border-radius: 10px; cursor: pointer; transition: 0.3s; font-size: 1rem; }
    .auth-btn:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(200, 255, 87, 0.2); }
    .auth-btn-google { width: 100%; padding: 14px; background: #fff; color: #000; font-weight: 600; border: none; border-radius: 10px; cursor: pointer; transition: 0.3s; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px; }
    .auth-btn-google:hover { background: #f1f1f1; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(255, 255, 255, 0.1); }
    .auth-divider { display: flex; align-items: center; text-align: center; color: rgba(255,255,255,0.3); font-size: 0.85rem; margin-bottom: 20px; }
    .auth-divider::before, .auth-divider::after { content: ''; flex: 1; border-bottom: 1px solid rgba(255,255,255,0.1); }
    .auth-divider::before { margin-right: .5em; }
    .auth-divider::after { margin-left: .5em; }
    .auth-close { position: absolute; top: 15px; right: 20px; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 1.5rem; transition: color 0.3s; }
    .auth-close:hover { color: #fff; }
    .nav-user-menu { position: relative; }
    .nav-user-dropdown { position: absolute; top: 100%; right: 0; background: rgba(18, 18, 24, 0.95); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 0; min-width: 160px; display: none; flex-direction: column; z-index: 100; box-shadow: 0 20px 40px rgba(0,0,0,0.6); backdrop-filter: blur(20px); }
    .nav-user-menu.active .nav-user-dropdown { display: flex; animation: fadeUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .nav-user-dropdown a, .nav-user-dropdown button { padding: 10px 20px; color: #fff; text-decoration: none; background: none; border: none; text-align: left; cursor: pointer; font-size: 0.9rem; width: 100%; display: block; transition: 0.2s; }
    .nav-user-dropdown a:hover, .nav-user-dropdown button:hover { background: rgba(255,255,255,0.05); color: var(--sneaker-accent, #c8ff57); }
    .nav-login-btn { cursor: pointer; font-weight: 500; color: var(--sneaker-accent, #c8ff57) !important; background: rgba(200,255,87,0.1); padding: 8px 16px; border-radius: 30px; border: 1px solid rgba(200,255,87,0.2); transition: 0.3s; }
    .nav-login-btn:hover { background: var(--sneaker-accent, #c8ff57); color: #000 !important; transform: scale(1.05); }
  `;
  document.head.appendChild(style);

  const modalHtml = `
    <div class="auth-modal-overlay" id="auth-modal-overlay">
      <div class="auth-modal" style="position: relative;">
        <span class="auth-close" id="auth-close">&times;</span>
        
        <h2 style="font-family: var(--font-display); font-size: 1.8rem; margin-bottom: 25px; text-align: center;">Bienvenue</h2>
        
        <button class="auth-btn-google" id="btn-google-auth">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuer avec Google
        </button>
        
        <div class="auth-divider">ou avec un email</div>

        <div class="auth-tabs">
          <div class="auth-tab active" id="tab-login">Connexion</div>
          <div class="auth-tab" id="tab-register">Inscription</div>
        </div>
        
        <form id="auth-form">
          <input type="email" id="auth-email" class="auth-input" placeholder="Adresse email" required />
          <input type="password" id="auth-password" class="auth-input" placeholder="Mot de passe" required />
          <button type="submit" class="auth-btn" id="auth-submit">Se connecter</button>
          <p id="auth-error" style="color: #ff5252; font-size: 0.85rem; margin-top: 15px; text-align: center;"></p>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // 2. Logic
  let isLoginMode = true;
  let currentUser = null;
  let currentProfile = null;

  const overlay = document.getElementById('auth-modal-overlay');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const authForm = document.getElementById('auth-form');
  const submitBtn = document.getElementById('auth-submit');
  const authError = document.getElementById('auth-error');

  window.openAuthModal = () => { overlay.classList.add('active'); };
  document.getElementById('auth-close').addEventListener('click', () => { overlay.classList.remove('active'); });
  overlay.addEventListener('click', (e) => { if(e.target === overlay) overlay.classList.remove('active'); });

  tabLogin.addEventListener('click', () => {
    isLoginMode = true;
    tabLogin.classList.add('active'); tabRegister.classList.remove('active');
    submitBtn.textContent = 'Se connecter'; authError.textContent = '';
  });

  tabRegister.addEventListener('click', () => {
    isLoginMode = false;
    tabRegister.classList.add('active'); tabLogin.classList.remove('active');
    submitBtn.textContent = 'Créer mon compte'; authError.textContent = '';
  });

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    submitBtn.textContent = 'Chargement...';
    authError.textContent = '';

    if (isLoginMode) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) authError.textContent = error.message;
      else window.location.reload();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) authError.textContent = error.message;
      else {
        authError.style.color = '#c8ff57';
        authError.textContent = "Compte créé ! Vous êtes connecté.";
        setTimeout(() => window.location.reload(), 1500);
      }
    }
    submitBtn.textContent = isLoginMode ? 'Se connecter' : 'Créer mon compte';
  });

  document.getElementById('btn-google-auth').addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/spreadsheet/profile/' }
    });
    if (error) {
      authError.textContent = error.message;
    }
  });

  // 3. Check Session and update Nav
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel === 'aal1') {
      // Force 2FA Verification
      overlay.classList.add('active');
      document.getElementById('auth-close').style.display = 'none'; // Prevent closing
      document.querySelector('.auth-modal').innerHTML = `
        <h2 style="font-family: var(--font-display); font-size: 1.8rem; margin-bottom: 25px; text-align: center;">Double Authentification</h2>
        <p style="text-align:center; font-size:0.9rem; color:rgba(255,255,255,0.6); margin-bottom:20px;">Veuillez entrer le code à 6 chiffres de votre application d'authentification pour continuer.</p>
        <form id="form-global-2fa">
          <input type="text" id="global-2fa-code" class="auth-input" placeholder="Code à 6 chiffres" required />
          <button type="submit" class="auth-btn" id="btn-global-2fa">Vérifier le code</button>
          <p id="global-2fa-error" style="color: #ff5252; font-size: 0.85rem; margin-top: 15px; text-align: center;"></p>
          <button type="button" id="btn-global-logout" style="background:none; border:none; color:rgba(255,255,255,0.4); text-decoration:underline; cursor:pointer; width:100%; margin-top:15px;">Se déconnecter</button>
        </form>
      `;
      
      document.getElementById('btn-global-logout').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.reload();
      });

      document.getElementById('form-global-2fa').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('global-2fa-code').value.trim();
        const err = document.getElementById('global-2fa-error');
        const btn = document.getElementById('btn-global-2fa');
        btn.textContent = 'Vérification...';
        err.textContent = '';

        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.all?.find(f => f.status === 'verified');
        
        if (!totpFactor) {
          err.textContent = "Aucun facteur 2FA valide trouvé.";
          btn.textContent = 'Vérifier le code';
          return;
        }

        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
        if (challengeError) {
          err.textContent = challengeError.message;
          btn.textContent = 'Vérifier le code';
          return;
        }

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: totpFactor.id,
          challengeId: challengeData.id,
          code: code
        });

        if (verifyError) {
          err.textContent = "Code invalide.";
          btn.textContent = 'Vérifier le code';
        } else {
          window.location.reload();
        }
      });
      return; // Stop execution, don't load the rest of the app for this user until AAL2
    }

    // Normal AAL2 or AAL1 (without 2FA enabled) flow
    currentUser = session.user;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = profile;
    
    // Google Avatar auto-fill logic
    if (currentUser.user_metadata?.avatar_url && (!currentProfile || !currentProfile.avatar_url)) {
      const googleAvatar = currentUser.user_metadata.avatar_url;
      const { error } = await supabase.from('profiles').update({ avatar_url: googleAvatar }).eq('id', currentUser.id);
      if (!error && currentProfile) {
        currentProfile.avatar_url = googleAvatar;
      }
    }

    window.currentUser = currentUser;
    window.currentProfile = currentProfile;
  }

  // Update navbar (wait a bit for the navbar to render if we are in index.html)
  setTimeout(() => {
    const navRight = document.querySelector('.nav-right');
    if (navRight) {
      if (currentUser) {
        const displayName = currentProfile?.display_name || currentProfile?.email?.split('@')[0] || 'Utilisateur';
        const avatarUrl = currentProfile?.avatar_url;
        const avatarHtml = avatarUrl 
          ? `<img src="${avatarUrl}" alt="Avatar" style="width:24px; height:24px; border-radius:50%; object-fit:cover;">`
          : `<div style="width:24px; height:24px; border-radius:50%; background:rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold;">${displayName.charAt(0).toUpperCase()}</div>`;

        navRight.innerHTML = `
          <div class="nav-user-menu" id="nav-user-menu">
            <button class="nav-login-btn" style="display:flex; align-items:center; gap:8px;">
              ${avatarHtml}
              ${displayName}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="nav-user-dropdown">
              <a href="/spreadsheet/profile/">Mon Compte</a>
              ${currentProfile?.role === 'admin' ? '<a href="/spreadsheet/admin/">Admin</a>' : ''}
              <button id="nav-logout">Déconnexion</button>
            </div>
          </div>
        `;
        document.getElementById('nav-user-menu').addEventListener('click', function(e) {
          if (e.target.closest('.nav-user-dropdown')) return;
          this.classList.toggle('active');
        });
        document.getElementById('nav-logout').addEventListener('click', async () => {
          await supabase.auth.signOut();
          window.location.reload();
        });
      } else {
        navRight.innerHTML = `<button class="nav-login-btn" onclick="openAuthModal()">Se connecter</button>`;
      }
    }
  }, 100);

})();
