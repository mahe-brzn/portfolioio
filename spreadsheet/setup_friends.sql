-- =============================================
-- TABLE: friends
-- Gère les relations entre utilisateurs
-- À exécuter dans le SQL Editor de Supabase
-- =============================================

CREATE TABLE IF NOT EXISTS public.friends (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);

-- Activer RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Policies RLS
DO $$
BEGIN
  -- Lire ses propres amis
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own friends' AND tablename = 'friends') THEN
    CREATE POLICY "Users can read own friends" ON public.friends
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Ajouter un ami
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own friends' AND tablename = 'friends') THEN
    CREATE POLICY "Users can insert own friends" ON public.friends
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Supprimer un ami
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own friends' AND tablename = 'friends') THEN
    CREATE POLICY "Users can delete own friends" ON public.friends
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Recharger le cache PostgREST
NOTIFY pgrst, 'reload schema';
