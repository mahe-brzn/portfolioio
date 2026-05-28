// REMPLACE PAR TES VRAIES INFOS SUPABASE
// 1. Va sur ton Dashboard Supabase > Project Settings > API
// 2. Copie l'URL du projet et colle-la ci-dessous
const SUPABASE_URL = 'https://TON_PROJET.supabase.co';

// 3. Copie la clé "anon" (Project API keys) et colle-la ci-dessous
const SUPABASE_KEY = 'TON_ANON_KEY';

// NE PAS MODIFIER LA LIGNE CI-DESSOUS
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
