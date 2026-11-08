-- Incolla tutto nel SQL Editor di Supabase ed esegui (Run).

-- 1) Tabella della lettera (una sola riga, id = 1)
create table if not exists public.letter (
  id int primary key default 1,
  body text not null,
  signature text
);

alter table public.letter enable row level security;

-- Il sito (chiave anon) può solo LEGGERE. Nessuna policy di scrittura = nessuno può modificare dal browser.
create policy "letter: lettura pubblica"
  on public.letter for select
  using (true);

-- Scrivi qui la tua lettera. Una riga vuota = nuovo paragrafo.
insert into public.letter (id, body, signature) values (
  1,
  E'Cara Elettra,\n\nQui scrivi il primo paragrafo.\n\nQui il secondo paragrafo.',
  'Con affetto, [il tuo nome]'
)
on conflict (id) do update set body = excluded.body, signature = excluded.signature;

-- 2) Bucket pubblico per le foto
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Lettura (elenco file) per il sito
create policy "photos: lettura pubblica"
  on storage.objects for select
  using (bucket_id = 'photos');

-- Le foto si caricano dalla dashboard: Storage > photos > Upload.
-- Nomina i file 01.jpg, 02.jpg, 03.jpg... per decidere l'ordine.
