// Initialiser Supabase
const SUPABASE_URL = 'https://jntracolqkirsnnlyitz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpudHJhY29scWtpcnNubmx5aXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTUzNDksImV4cCI6MjA5NTU3MTM0OX0.4LgeJJ69bGqZwvqNMWVFY6ieKSfi5Hx96J43vO9_uDM';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let currentUser = null;
let spreadsheets = [];

// DOM
const authView = document.getElementById('auth-view');
const addView = document.getElementById('add-view');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const authError = document.getElementById('auth-error');

const spreadsheetSelect = document.getElementById('spreadsheet-select');
const itemTitle = document.getElementById('item-title');
const itemPrice = document.getElementById('item-price');
const itemKeywords = document.getElementById('item-keywords');
const itemUrl = document.getElementById('item-url');
const btnAdd = document.getElementById('btn-add');
const btnLogout = document.getElementById('btn-logout');
const addStatus = document.getElementById('add-status');

// Init
document.addEventListener('DOMContentLoaded', async () => {
  // Check session
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    showAddView();
  }
});

// Login
btnLogin.addEventListener('click', async () => {
  authError.textContent = '';
  btnLogin.textContent = 'Connexion...';
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value,
  });
  
  btnLogin.textContent = 'Se connecter';
  if (error) {
    authError.textContent = "Email ou mot de passe incorrect.";
  } else {
    currentUser = data.user;
    showAddView();
  }
});

// Logout
btnLogout.addEventListener('click', async () => {
  await supabase.auth.signOut();
  currentUser = null;
  addView.style.display = 'none';
  authView.style.display = 'block';
  emailInput.value = '';
  passwordInput.value = '';
});

// Main View
async function showAddView() {
  authView.style.display = 'none';
  addView.style.display = 'block';
  addStatus.textContent = 'Chargement de vos spreadsheets...';
  
  // 1. Get Active Tab Info
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (tabs && tabs[0]) {
      // Clean up the title (remove " - Vinted" or similar)
      let title = tabs[0].title || '';
      title = title.split(' - ')[0].split(' | ')[0];
      itemTitle.value = title;
      itemUrl.value = tabs[0].url || '';
    }
  });

  // 2. Fetch Spreadsheets
  const { data, error } = await supabase.from('spreadsheets').select('*');
  addStatus.textContent = '';
  
  if (data) {
    // Show spreadsheets where the user is owner OR editor
    spreadsheets = data.filter(s => s.owner_id === currentUser.id || (s.editors && s.editors.includes(currentUser.id)));
    
    spreadsheetSelect.innerHTML = '';
    if (spreadsheets.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = "Aucune spreadsheet trouvée";
      opt.disabled = true;
      spreadsheetSelect.appendChild(opt);
      btnAdd.disabled = true;
    } else {
      spreadsheets.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.title;
        spreadsheetSelect.appendChild(opt);
      });
      btnAdd.disabled = false;
    }
  } else {
    addStatus.style.color = '#ff5252';
    addStatus.textContent = "Erreur de chargement des spreadsheets.";
  }
}

// Add Item
btnAdd.addEventListener('click', async () => {
  if (!spreadsheetSelect.value) return;
  
  addStatus.style.color = '#c8ff57';
  addStatus.textContent = 'Ajout en cours...';
  btnAdd.disabled = true;
  
  const targetId = spreadsheetSelect.value;
  const sheet = spreadsheets.find(s => s.id === targetId);
  const items = sheet.items || [];
  
  items.push({
    title: itemTitle.value,
    price: itemPrice.value,
    url: itemUrl.value,
    keywords: itemKeywords.value
  });
  
  const { error } = await supabase
    .from('spreadsheets')
    .update({ items })
    .eq('id', targetId);
    
  btnAdd.disabled = false;
  if (error) {
    addStatus.style.color = '#ff5252';
    addStatus.textContent = 'Erreur: ' + error.message;
  } else {
    addStatus.style.color = '#c8ff57';
    addStatus.textContent = 'Article ajouté avec succès !';
    itemPrice.value = '';
    itemKeywords.value = '';
    setTimeout(() => { addStatus.textContent = ''; }, 3000);
  }
});
