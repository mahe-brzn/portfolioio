-- Table LIKES
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    spreadsheet_id UUID REFERENCES public.spreadsheets(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, spreadsheet_id)
);

-- Table FAVORITES
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    spreadsheet_id UUID REFERENCES public.spreadsheets(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, spreadsheet_id)
);

-- Table SUGGESTIONS
CREATE TABLE IF NOT EXISTS public.suggestions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    spreadsheet_id UUID REFERENCES public.spreadsheets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    price TEXT,
    note TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table COMMENTS
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    spreadsheet_id UUID REFERENCES public.spreadsheets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Active RLS
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- LIKES policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public likes read' AND tablename = 'likes') THEN
        CREATE POLICY "Public likes read" ON public.likes FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own likes' AND tablename = 'likes') THEN
        CREATE POLICY "Users can insert own likes" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own likes' AND tablename = 'likes') THEN
        CREATE POLICY "Users can delete own likes" ON public.likes FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;

-- FAVORITES policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own favs' AND tablename = 'favorites') THEN
        CREATE POLICY "Users can read own favs" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own favs' AND tablename = 'favorites') THEN
        CREATE POLICY "Users can insert own favs" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own favs' AND tablename = 'favorites') THEN
        CREATE POLICY "Users can delete own favs" ON public.favorites FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;

-- SUGGESTIONS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert suggestions' AND tablename = 'suggestions') THEN
        CREATE POLICY "Users can insert suggestions" ON public.suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Spreadsheet owners can read suggestions' AND tablename = 'suggestions') THEN
        CREATE POLICY "Spreadsheet owners can read suggestions" ON public.suggestions FOR SELECT USING (
            EXISTS (SELECT 1 FROM public.spreadsheets WHERE id = spreadsheet_id AND owner_id = auth.uid())
            OR auth.uid() = user_id
        );
    END IF;
END
$$;

-- COMMENTS policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public comments read' AND tablename = 'comments') THEN
        CREATE POLICY "Public comments read" ON public.comments FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert comments' AND tablename = 'comments') THEN
        CREATE POLICY "Users can insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own comments' AND tablename = 'comments') THEN
        CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Spreadsheet owners can delete comments' AND tablename = 'comments') THEN
        CREATE POLICY "Spreadsheet owners can delete comments" ON public.comments FOR DELETE USING (
            EXISTS (SELECT 1 FROM public.spreadsheets WHERE id = spreadsheet_id AND owner_id = auth.uid())
        );
    END IF;
END
$$;

-- Trigger pour mettre à jour le compteur de likes sur la table spreadsheets
CREATE OR REPLACE FUNCTION update_spreadsheet_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.spreadsheets SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.spreadsheet_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.spreadsheets SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.spreadsheet_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_spreadsheet_likes ON public.likes;
CREATE TRIGGER tr_spreadsheet_likes
AFTER INSERT OR DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION update_spreadsheet_likes_count();

-- Relaod cache
NOTIFY pgrst, 'reload schema';
