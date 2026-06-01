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
