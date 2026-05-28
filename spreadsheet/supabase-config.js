// REMPLACE PAR TES VRAIES INFOS SUPABASE
// 1. Va sur ton Dashboard Supabase > Project Settings > API
// 2. Copie l'URL du projet et colle-la ci-dessous
const SUPABASE_URL = 'https://jntracolqkirsnnlyitz.supabase.co';

// 3. Copie la clé "anon" (Project API keys) et colle-la ci-dessous
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpudHJhY29scWtpcnNubmx5aXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5OTUzNDksImV4cCI6MjA5NTU3MTM0OX0.4LgeJJ69bGqZwvqNMWVFY6ieKSfi5Hx96J43vO9_uDM';

// NE PAS MODIFIER LA LIGNE CI-DESSOUS
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
