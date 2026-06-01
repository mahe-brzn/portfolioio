-- 1. Ajouter la colonne 'display_name' à la table 'profiles' si elle n'existe pas
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;

-- 2. Ajouter la valeur 'creator' à l'enum des rôles
-- Attention : sur PostgreSQL on ne peut pas faire de "IF NOT EXISTS" sur un ADD VALUE de façon simple,
-- donc si vous avez une erreur disant que 'creator' existe déjà, vous pouvez l'ignorer.
ALTER TYPE public.user_role ADD VALUE 'creator';

-- 3. Autoriser les utilisateurs à mettre à jour leur propre profil
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING ( auth.uid() = id );

-- 4. Ajouter la colonne 'avatar_url' à la table 'profiles'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 5. Créer le bucket de stockage 'avatars' (à exécuter dans la console Supabase, la création de bucket via SQL peut nécessiter des droits d'admin postgres complets, mais c'est supporté par le dashboard Supabase)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

-- 6. Configurer les règles de sécurité (RLS) pour le bucket 'avatars'
CREATE POLICY "Avatar Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

CREATE POLICY "Avatar Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Avatar Update" 
ON storage.objects FOR UPDATE 
WITH CHECK ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
