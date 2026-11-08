-- =====================================================================
-- Elettra 18.0: Supabase, organizzato per cartelle
-- Incolla tutto nel SQL Editor ed esegui (Run).
-- Si può rieseguire senza errori e funziona anche se avevi già lanciato
-- le versioni precedenti: aggiunge ciò che manca, non cancella nulla
-- e non sovrascrive la lettera già scritta.
--
-- COME È ORGANIZZATO TUTTO
--   Bucket "photos" (cartelle con la maiuscola, file 1.jpeg, 2.jpeg ...):
--     Persone     -> sezione "Lei e le persone che ama" (12 foto/video)
--     Cibi        -> "I suoi cibi preferiti"
--     Silly       -> "Silly pictures"
--     Vibes       -> "Her vibes"
--     Musica      -> copertine della sezione musica
--     Luoghi      -> sfondi delle 5 destinazioni (1.jpeg = prima destinazione)
--     Mondo       -> "Un po' di lei in giro per il mondo"
--     Passatempi  -> "I suoi passatempi"
--     (fuori dalle cartelle) gey.jpeg = foto di copertina
--   Bucket "audio" (file 1.mp3, 2.mp3 ...): i brani, stesso numero della copertina.
--
--   Tabelle:
--     photo_folders   elenco ufficiale delle cartelle e a quale sezione servono
--     site_settings   impostazioni (foto di copertina, soprannome)
--     letter          la lettera
--     destinations    le 5 destinazioni (nome, posizione, foto in Luoghi)
--     music           artista, titolo, copertina (Musica) e brano (audio)
--     photo_captions  didascalie facoltative per le foto delle cartelle
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) TABELLE
-- ---------------------------------------------------------------------

-- Le cartelle del bucket "photos". Il nome deve essere IDENTICO (maiuscole comprese).
create table if not exists public.photo_folders (
  folder   text primary key,
  title    text not null,
  position int  not null
);

-- Impostazioni del sito, una riga per voce.
--   cover_photo = file della copertina, fuori dalle cartelle (es. gey.jpeg)
--   nickname    = soprannome che compare nella copertina
create table if not exists public.site_settings (
  key   text primary key,
  value text not null
);

-- La lettera: una sola riga (id = 1). Una riga vuota nel testo = nuovo paragrafo.
create table if not exists public.letter (
  id         int primary key default 1 check (id = 1),
  body       text not null,
  signature  text,
  updated_at timestamptz not null default now()
);

-- Le destinazioni. photo = nome del file nella cartella "Luoghi" (es. 1.jpeg)
create table if not exists public.destinations (
  id       bigint generated always as identity primary key,
  position int  not null,
  slug     text not null unique,
  name     text not null,
  photo    text,
  note     text
);
alter table public.destinations add column if not exists photo text;

-- La musica.
--   cover = file nella cartella "Musica" del bucket photos (es. 1.jpeg)
--   audio = file nel bucket "audio" (es. 1.mp3)
-- Se questa tabella resta vuota, il sito abbina da solo Musica/N.jpeg con audio/N.mp3.
create table if not exists public.music (
  id       bigint generated always as identity primary key,
  position int  not null,
  artist   text not null,
  title    text,
  cover    text,
  audio    text
);
alter table public.music add column if not exists audio text;

-- Didascalie facoltative: folder deve essere una delle cartelle di photo_folders.
create table if not exists public.photo_captions (
  folder    text not null references public.photo_folders (folder) on update cascade on delete cascade,
  file_name text not null,
  caption   text not null,
  primary key (folder, file_name)
);

-- Prima le cartelle ufficiali (devono esistere prima del collegamento qui sotto)
insert into public.photo_folders (folder, title, position) values
  ('Persone',    'Lei e le persone che ama',             1),
  ('Cibi',       'I suoi cibi preferiti',                2),
  ('Silly',      'Silly pictures',                       3),
  ('Vibes',      'Her vibes',                            4),
  ('Musica',     'La sua musica',                        5),
  ('Luoghi',     'Ma dove vorrebbe andare?',             6),
  ('Mondo',      'Un po’ di lei in giro per il mondo',   7),
  ('Passatempi', 'I suoi passatempi',                    8)
on conflict (folder) do update set title = excluded.title, position = excluded.position;

-- Rete di sicurezza: se in photo_captions c'è già una cartella non elencata sopra,
-- la aggiunge, così il collegamento non può fallire.
insert into public.photo_folders (folder, title, position)
select distinct folder, folder, 99 from public.photo_captions
on conflict (folder) do nothing;

-- Se photo_captions esisteva già senza il collegamento alle cartelle, lo aggiunge ora
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'photo_captions_folder_fkey') then
    alter table public.photo_captions
      add constraint photo_captions_folder_fkey
      foreign key (folder) references public.photo_folders (folder)
      on update cascade on delete cascade;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2) PERMESSI: il sito (chiave anon) può solo LEGGERE
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'photo_folders', 'site_settings', 'letter', 'destinations', 'music', 'photo_captions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s: lettura pubblica" on public.%I', t, t);
    execute format(
      'create policy "%s: lettura pubblica" on public.%I for select to anon, authenticated using (true)',
      t, t
    );
  end loop;
end $$;

-- Nessuna scrittura dal browser. Dal Table Editor e dal SQL Editor modifichi tutto come sempre.
revoke insert, update, delete
  on public.photo_folders, public.site_settings, public.letter,
     public.destinations, public.music, public.photo_captions
  from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3) DATI INIZIALI
-- ---------------------------------------------------------------------

-- Le cartelle sono inserite nella sezione 1, prima del collegamento con photo_captions.

-- Impostazioni
insert into public.site_settings (key, value) values
  ('cover_photo', 'gey.jpeg')
on conflict (key) do update set value = excluded.value;
-- Per il soprannome in copertina (togli i "--"):
-- insert into public.site_settings (key, value) values ('nickname', 'il tuo soprannome')
-- on conflict (key) do update set value = excluded.value;

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

-- Destinazioni: la foto 1.jpeg della cartella Luoghi è la prima destinazione, e così via
insert into public.destinations (position, slug, name, photo) values
  (1, 'giappone',  'Giappone',  '1.jpeg'),
  (2, 'svezia',    'Svezia',    '2.jpeg'),
  (3, 'kola',      'Kola',      '3.jpeg'),
  (4, 'argentina', 'Argentina', '4.jpeg'),
  (5, 'olanda',    'Olanda',    '5.jpeg')
on conflict (slug) do update
  set position = excluded.position, name = excluded.name, photo = excluded.photo;

-- Musica (togli i "--" e adatta; il numero del file è lo stesso per copertina e brano):
-- insert into public.music (position, artist, title, cover, audio) values
--   (1, 'Nome artista', 'Titolo del brano', '1.jpeg', '1.mp3'),
--   (2, 'Nome artista', 'Titolo del brano', '2.jpeg', '2.mp3');
-- Per aggiungere l'audio a un brano già inserito:
-- update public.music set audio = '1.mp3' where position = 1;

-- Didascalie (esempio):
-- insert into public.photo_captions (folder, file_name, caption) values
--   ('Persone', '1.jpeg', 'Una didascalia');

-- ---------------------------------------------------------------------
-- 4) BUCKET: "photos" (foto e video) e "audio" (brani), entrambi pubblici
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audio', 'audio', true, 52428800,
  array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/webm']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Il sito può leggere (e quindi elencare) i file dei due bucket
drop policy if exists "photos: lettura pubblica" on storage.objects;
create policy "photos: lettura pubblica"
  on storage.objects for select
  using (bucket_id = 'photos');

drop policy if exists "audio: lettura pubblica" on storage.objects;
create policy "audio: lettura pubblica"
  on storage.objects for select
  using (bucket_id = 'audio');
