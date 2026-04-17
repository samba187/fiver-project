-- Migration pour l'historique des paiements de l'Academy (Fiveur Academy Pro)

CREATE TABLE IF NOT EXISTS public.academy_payments_history (
    id bigserial primary key,
    registration_id bigint not null references public.academy_registrations(id) on delete cascade,
    mois_concerne text not null, -- Format YYYY-MM
    montant integer not null,
    moyen_paiement text,
    date_paiement timestamp with time zone default now(),
    description text
);

-- Ajouter le RLS (Row Level Security) sur academy_payments_history
ALTER TABLE public.academy_payments_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.academy_payments_history
    FOR ALL
    TO authenticated
    USING (true);

-- Création d'un bucket pour les reçus (PDF)
INSERT INTO storage.buckets (id, name, public) VALUES ('academy_receipts', 'academy_receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Autoriser l'accès au bucket
CREATE POLICY "Allow public read access for receipts" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'academy_receipts' );

CREATE POLICY "Allow authenticated insert for receipts" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'academy_receipts' );

CREATE POLICY "Allow authenticated update for receipts" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING ( bucket_id = 'academy_receipts' );
