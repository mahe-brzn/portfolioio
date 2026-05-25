-- ═══════════════════════════════════════════════════════════════════
-- GARAGE ALPIN — Script SQL à exécuter dans Supabase > SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. TABLE EMPLOYEES (Équipe)
create table if not exists public.employees (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text not null,
  description text,
  diplomes    text,
  image_url   text,
  sort_order  int default 99,
  created_at  timestamptz default now()
);

-- 2. TABLE VEHICLES (Véhicules de location)
create table if not exists public.vehicles (
  id            uuid primary key default gen_random_uuid(),
  model         text not null,
  category      text not null default 'citadine',
  price_per_day numeric(8,2),
  year          int,
  features      text[] default '{}',
  description   text,
  available     boolean default true,
  image_url     text,
  created_at    timestamptz default now()
);

-- 3. TABLE SERVICES (Services page d'accueil)
create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  sort_order  int default 99,
  created_at  timestamptz default now()
);

-- 4. TABLE HORAIRES (Horaires d'ouverture)
create table if not exists public.horaires (
  id               uuid primary key default gen_random_uuid(),
  day              text not null unique,
  sort_order       int default 99,
  closed           boolean default false,
  morning_open     time,
  morning_close    time,
  afternoon_open   time,
  afternoon_close  time
);

-- ── Row Level Security (RLS) ─────────────────────────────────────────────────

-- Lecture publique (le site public peut lire les données)
alter table public.employees enable row level security;
alter table public.vehicles  enable row level security;
alter table public.services  enable row level security;
alter table public.horaires  enable row level security;

create policy "lecture publique employees" on public.employees for select using (true);
create policy "lecture publique vehicles"  on public.vehicles  for select using (true);
create policy "lecture publique services"  on public.services  for select using (true);
create policy "lecture publique horaires"  on public.horaires  for select using (true);

-- Écriture uniquement pour les utilisateurs authentifiés (admin)
create policy "ecriture admin employees" on public.employees for all using (auth.role() = 'authenticated');
create policy "ecriture admin vehicles"  on public.vehicles  for all using (auth.role() = 'authenticated');
create policy "ecriture admin services"  on public.services  for all using (auth.role() = 'authenticated');
create policy "ecriture admin horaires"  on public.horaires  for all using (auth.role() = 'authenticated');

-- ── Storage Buckets ──────────────────────────────────────────────────────────
-- Exécutez ces lignes pour créer les buckets de stockage d'images
insert into storage.buckets (id, name, public) values ('employees', 'employees', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('vehicles',  'vehicles',  true) on conflict do nothing;

create policy "upload admin employees" on storage.objects for insert with check (bucket_id = 'employees' and auth.role() = 'authenticated');
create policy "lecture publique employees storage" on storage.objects for select using (bucket_id = 'employees');
create policy "upload admin vehicles" on storage.objects for insert with check (bucket_id = 'vehicles' and auth.role() = 'authenticated');
create policy "lecture publique vehicles storage" on storage.objects for select using (bucket_id = 'vehicles');

-- ── Données initiales (Équipe actuelle) ─────────────────────────────────────
insert into public.employees (name, role, description, image_url, sort_order) values
  ('Romain Bouvet',    'Co-fondateur & Chef mécanicien',   'Expert en mécanique lourde et diagnostic avancé. Romain dirige l''atelier avec une rigueur et une passion communicatives depuis la création du garage.', null, 1),
  ('Jonathan Courtois','Co-fondateur & Électronicien',     'Spécialiste du diagnostic électronique et des systèmes embarqués. Jonathan maîtrise les dernières technologies des véhicules modernes.', null, 2),
  ('Élie',             'Technicien mécanicien',             'Passionné de mécanique depuis toujours, Élie intervient sur toutes les marques avec une minutie remarquable.', null, 3),
  ('Technicien',       'Spécialiste Distribution',          'Expert en distribution et transmission, il assure la fiabilité et la sécurité des moteurs sur le long terme.', null, 4),
  ('Technicien',       'Sécurité & Freinage',               'Sur nos routes de montagne, le freinage ne souffre aucune approximation. Il en fait sa spécialité au quotidien.', null, 5);

-- ── Données initiales (Services) ────────────────────────────────────────────
insert into public.services (name, description, sort_order) values
  ('Mécanique générale',       'Entretien courant, vidanges, freins, suspension. Toutes marques, tous modèles.', 1),
  ('Diagnostic électronique',  'Lecture et effacement de codes défaut. Diagnostic avancé des systèmes embarqués.', 2),
  ('Distribution & Moteur',    'Remplacement de courroies de distribution, révision moteur, joints de culasse.', 3),
  ('Sécurité & Contrôle',      'Préparation au contrôle technique, vérification de tous les systèmes de sécurité.', 4);

-- ── Données initiales (Horaires) ────────────────────────────────────────────
insert into public.horaires (day, sort_order, closed, morning_open, morning_close, afternoon_open, afternoon_close) values
  ('Lundi',    1, false, '08:00', '12:00', '14:00', '18:00'),
  ('Mardi',    2, false, '08:00', '12:00', '14:00', '18:00'),
  ('Mercredi', 3, false, '08:00', '12:00', '14:00', '18:00'),
  ('Jeudi',    4, false, '08:00', '12:00', '14:00', '18:00'),
  ('Vendredi', 5, false, '08:00', '12:00', '14:00', '17:00'),
  ('Samedi',   6, false, null,    null,    null,    null),
  ('Dimanche', 7, true,  null,    null,    null,    null)
on conflict (day) do nothing;
