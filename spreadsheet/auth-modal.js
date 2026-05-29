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
      background: #121218; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
      padding: 30px; width: 90%; max-width: 400px;
      transform: translateY(20px); transition: transform 0.3s;
    }
    .auth-modal-overlay.active .auth-modal { transform: translateY(0); }
    .auth-tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px; }
    .auth-tab { flex: 1; text-align: center; padding: 10px; cursor: pointer; color: rgba(255,255,255,0.5); border-bottom: 2px solid transparent; }
    .auth-tab.active { color: #fff; border-color: var(--sneaker-accent, #c8ff57); }
    .auth-input { width: 100%; padding: 12px; margin-bottom: 15px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 8px; font-family: inherit; }
    .auth-btn { width: 100%; padding: 12px; background: var(--sneaker-accent, #c8ff57); color: #000; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; transition: 0.3s; }
    .auth-btn:hover { background: #fff; }
    .auth-close { position: absolute; top: 15px; right: 20px; color: rgba(255,255,255,0.5); cursor: pointer; font-size: 1.5rem; }
    .nav-user-menu { position: relative; }
    .nav-user-dropdown { position: absolute; top: 100%; right: 0; background: #121218; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 10px 0; min-width: 150px; display: none; flex-direction: column; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .nav-user-menu.active .nav-user-dropdown { display: flex; }
    .nav-user-dropdown a, .nav-user-dropdown button { padding: 8px 20px; color: #fff; text-decoration: none; background: none; border: none; text-align: left; cursor: pointer; font-size: 0.9rem; width: 100%; display: block;}
    .nav-user-dropdown a:hover, .nav-user-dropdown button:hover { background: rgba(255,255,255,0.05); }
    .nav-login-btn { cursor: pointer; font-weight: 500; color: var(--sneaker-accent, #c8ff57) !important; background: rgba(200,255,87,0.1); padding: 6px 12px; border-radius: 20px; border: 1px solid rgba(200,255,87,0.2); transition: 0.3s; }
    .nav-login-btn:hover { background: var(--sneaker-accent, #c8ff57); color: #000 !important; }
  `;
  document.head.appendChild(style);

  const modalHtml = `
    <div class="auth-modal-overlay" id="auth-modal-overlay">
      <div class="auth-modal" style="position: relative;">
        <span class="auth-close" id="auth-close">&times;</span>
        <div class="auth-tabs">
          <div class="auth-tab active" id="tab-login">Connexion</div>
          <div class="auth-tab" id="tab-register">Inscription</div>
        </div>
        
        <form id="auth-form">
          <input type="email" id="auth-email" class="auth-input" placeholder="Email" required />
          <input type="password" id="auth-password" class="auth-input" placeholder="Mot de passe" required />
          <button type="submit" class="auth-btn" id="auth-submit">Se connecter</button>
          <p id="auth-error" style="color: #ff5252; font-size: 0.85rem; margin-top: 10px; text-align: center;"></p>
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

  // 3. Check Session and update Nav
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = profile;
    window.currentUser = currentUser;
    window.currentProfile = currentProfile;
  }

  // Update navbar (wait a bit for the navbar to render if we are in index.html)
  setTimeout(() => {
    const navRight = document.querySelector('.nav-right');
    if (navRight) {
      if (currentUser) {
        navRight.innerHTML = `
          <div class="nav-user-menu" id="nav-user-menu">
            <button class="nav-login-btn" style="display:flex; align-items:center; gap:8px;">
              ${currentProfile?.email?.split('@')[0] || 'Utilisateur'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
            </button>
            <div class="nav-user-dropdown">
              <a href="/spreadsheet/profile/">Mon espace</a>
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
