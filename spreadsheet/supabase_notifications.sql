-- ==========================================
-- CREATION DE LA TABLE NOTIFICATIONS
-- ==========================================

-- 1. Créer la table notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Activer RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Politique : Les utilisateurs peuvent voir uniquement leurs propres notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- 4. Politique : N'importe quel utilisateur authentifié peut créer une notification (ex: pour envoyer une demande d'ami)
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 5. Politique : L'utilisateur peut marquer ses notifications comme lues ou les supprimer
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- 6. INDEX pour accélérer les requêtes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
