-- =====================================================================
-- Elettra 18.0: configurazione di Supabase
-- Incolla tutto nel SQL Editor ed esegui (Run).
-- Si può rieseguire senza errori: non cancella dati e non sovrascrive
-- la lettera già scritta.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) TABELLE
-- ---------------------------------------------------------------------

-- La lettera: una sola riga (id = 1). Una riga vuota nel testo = nuovo paragrafo.
create table if not exists public.letter (
  id         int primary key default 1 check (id = 1),
  body       text not null,
  signature  text,
  updated_at timestamptz not null default now()
);

-- Le cinque destinazioni. La foto di sfondo è nel bucket "photos",
-- cartella "viaggi", con il nome uguale allo slug (es. viaggi/kola.jpg).
create table if not exists public.destinations (
  id       bigint generated always as identity primary key,
  position int  not null,
  slug     text not null unique,
  name     text not null,
  note     text
);

-- La musica: artista, titolo, copertina e brano da riprodurre.
--   cover = nome del file nella cartella "musica" del bucket "photos" (es. 01.jpg)
--   audio = nome del file nel bucket "audio" (es. 01.mp3)
create table if not exists public.music (
  id       bigint generated always as identity primary key,
  position int  not null,
  artist   text not null,
  title    text,
  cover    text,
  audio    text
);

-- Se la tabella "music" esisteva già senza la colonna audio, la aggiunge ora
alter table public.music add column if not exists audio text;

-- Didascalie facoltative per le foto delle gallerie.
-- folder = cartella nel bucket (es. persone), file_name = nome del file (es. 01.jpg)
create table if not exists public.photo_captions (
  folder    text not null,
  file_name text not null,
  caption   text not null,
  primary key (folder, file_name)
);

-- ---------------------------------------------------------------------
-- 2) PERMESSI: il sito (chiave anon) può solo LEGGERE
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['letter', 'destinations', 'music', 'photo_captions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s: lettura pubblica" on public.%I', t, t);
    execute format(
      'create policy "%s: lettura pubblica" on public.%I for select to anon, authenticated using (true)',
      t, t
    );
  end loop;
end $$;

-- Cintura di sicurezza: nessuna scrittura dal browser.
-- Dal SQL Editor e dal Table Editor di Supabase puoi modificare tutto come sempre.
revoke insert, update, delete
  on public.letter, public.destinations, public.music, public.photo_captions
  from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) DATI INIZIALI
-- ---------------------------------------------------------------------

-- Lettera di esempio (se esiste già, non viene toccata)
insert into public.letter (id, body, signature) values (
  1,
  E'Cara Elettra,\n\nQui scrivi il primo paragrafo.\n\nQui il secondo paragrafo.',
  'Con affetto, [il tuo nome]'
)
on conflict (id) do nothing;

-- Per modificare la lettera in seguito:
-- update public.letter
--    set body = E'Cara Elettra,\n\nPrimo paragrafo.\n\nSecondo paragrafo.',
--        signature = 'Con affetto, ...',
--        updated_at = now()
--  where id = 1;

-- Destinazioni
insert into public.destinations (position, slug, name) values
  (1, 'giappone',  'Giappone'),
  (2, 'svezia',    'Svezia'),
  (3, 'kola',      'Kola'),
  (4, 'argentina', 'Argentina'),
  (5, 'olanda',    'Olanda')
on conflict (slug) do update set position = excluded.position, name = excluded.name;

-- Esempi per la musica e le didascalie (togli i "--" per usarli):
-- insert into public.music (position, artist, title, cover, audio) values
--   (1, 'Nome artista', 'Titolo del brano', '01.jpg', '01.mp3');
-- Per aggiungere l'audio a un brano già inserito:
-- update public.music set audio = '01.mp3' where position = 1;
-- insert into public.photo_captions (folder, file_name, caption) values
--   ('persone', '01.jpg', 'Una didascalia');

-- ---------------------------------------------------------------------
-- 4) FOTO: bucket pubblico "photos"
-- Le foto si caricano da Storage > photos > Upload, dentro cartelle:
--   cover, persone, cibo, silly, vibes, musica, viaggi, mondo, passatempi, pony
-- (la cartella nasce quando carichi un file con quel percorso)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos', 'photos', true, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Il sito può leggere (e quindi elencare) i file del bucket
drop policy if exists "photos: lettura pubblica" on storage.objects;
create policy "photos: lettura pubblica"
  on storage.objects for select
  using (bucket_id = 'photos');

-- ---------------------------------------------------------------------
-- 5) AUDIO: bucket pubblico "audio" per i brani della sezione musica
-- Carica i file da Storage > audio > Upload (nome uguale a quello scritto
-- nella colonna "audio", es. 01.mp3). Massimo 50 MB per file.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio', 'audio', true, 52428800,
  array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/webm']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "audio: lettura pubblica" on storage.objects;
create policy "audio: lettura pubblica"
  on storage.objects for select
  using (bucket_id = 'audio');
