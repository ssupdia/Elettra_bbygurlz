// ============================================================
// CONFIGURAZIONE SUPABASE
// Dashboard di Supabase > Project Settings > API
// Incolla qui il Project URL e la chiave "anon public".
// La chiave anon è fatta per stare nel browser: i permessi li
// decidono le policy RLS (vedi supabase-setup.sql).
// ============================================================
const SUPABASE_URL = 'https://tnrpttyhlamcnwravmik.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3iiRaVZvcvP83fqa28ZPUA_WV4nw1zE';

const configurato = !SUPABASE_URL.startsWith('INCOLLA') && !SUPABASE_ANON_KEY.startsWith('INCOLLA');
const db = configurato && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ---------- Tab della cultura pop ----------
document.querySelectorAll('.tab').forEach(function (tab) {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(function (t) { t.setAttribute('aria-selected', 'false'); });
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('on'); });
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(tab.dataset.p).classList.add('on');
  });
});

// ---------- Apertura della lettera ----------
const btnLetter = document.getElementById('openLetter');
const paper = document.getElementById('paper');
btnLetter.addEventListener('click', function () {
  const aperta = paper.hidden;
  paper.hidden = !aperta;
  btnLetter.setAttribute('aria-expanded', String(aperta));
  btnLetter.textContent = aperta ? 'Chiudi la lettera' : 'Apri la lettera';
  if (aperta) paper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// ---------- Lightbox ----------
const box = document.getElementById('lightbox');
const boxImg = box.querySelector('img');
document.addEventListener('click', function (e) {
  if (!e.target.matches('.ph img')) return;
  boxImg.src = e.target.src;
  boxImg.alt = e.target.alt;
  box.classList.add('on');
});
function chiudiBox() { box.classList.remove('on'); boxImg.src = ''; }
document.getElementById('closeBox').addEventListener('click', chiudiBox);
box.addEventListener('click', function (e) { if (e.target === box) chiudiBox(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') chiudiBox(); });

// ---------- Gallerie ----------
// Ogni <div class="gallery" data-folder="nome" data-slots="N"> mostra:
//  1) le foto del bucket Supabase "photos", cartella "nome" (ordine alfabetico)
//  2) altrimenti le foto locali foto/nome/1.jpg, 2.jpg ...
//  3) altrimenti dei riquadri colorati segnaposto
function creaFoto(src, alt) {
  const fig = document.createElement('figure');
  fig.className = 'ph';
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.loading = 'lazy';
  fig.appendChild(img);
  return fig;
}

function riempiSegnaposto(g) {
  const cartella = g.dataset.folder;
  const n = parseInt(g.dataset.slots, 10) || 6;
  for (let i = 1; i <= n; i++) {
    const fig = creaFoto('foto/' + cartella + '/' + i + '.jpg', 'Foto ' + i);
    const label = document.createElement('span');
    label.textContent = 'Foto ' + i;
    fig.prepend(label);
    fig.querySelector('img').onerror = function () { this.remove(); };
    g.appendChild(fig);
  }
}

async function caricaDaSupabase(g) {
  if (!db) return;
  const cartella = g.dataset.folder;
  try {
    const { data, error } = await db.storage.from('photos').list(cartella, {
      limit: 60, sortBy: { column: 'name', order: 'asc' }
    });
    if (error || !data) return;
    const file = data.filter(function (f) { return /\.(jpe?g|png|webp|gif)$/i.test(f.name); });
    if (!file.length) return;
    g.textContent = '';
    file.forEach(function (f, i) {
      const url = db.storage.from('photos').getPublicUrl(cartella + '/' + f.name).data.publicUrl;
      g.appendChild(creaFoto(url, 'Elettra, ' + cartella + ' ' + (i + 1)));
    });
  } catch (err) {
    console.error('Foto "' + cartella + '" non caricate da Supabase:', err);
  }
}

document.querySelectorAll('.gallery[data-folder]').forEach(function (g) {
  riempiSegnaposto(g);
  caricaDaSupabase(g);
});

// ---------- Lettera da Supabase ----------
// Tabella "letter": id = 1, body = testo (paragrafi separati da una riga vuota), signature = firma
async function caricaLettera() {
  if (!db) return;
  try {
    const { data, error } = await db.from('letter').select('body, signature').eq('id', 1).single();
    if (error || !data) return;
    paper.textContent = '';
    data.body.split(/\n\s*\n/).forEach(function (testo) {
      const p = document.createElement('p');
      p.textContent = testo.trim(); // textContent: niente HTML, niente rischi
      paper.appendChild(p);
    });
    if (data.signature) {
      const s = document.createElement('p');
      s.className = 'sign';
      s.textContent = data.signature;
      paper.appendChild(s);
    }
  } catch (err) {
    console.error('Lettera non caricata, uso il testo di riserva:', err);
  }
}
caricaLettera();

// ---------- Conto alla rovescia: venerdì 13 novembre 2026 ----------
(function () {
  const el = document.getElementById('countdown');
  const traguardo = new Date(2026, 10, 13, 0, 0, 0); // mese 10 = novembre
  function aggiorna() {
    const ms = traguardo - new Date();
    if (ms <= 0) { el.textContent = 'Oggi è il grande giorno: buon compleanno!'; return; }
    const giorni = Math.floor(ms / 86400000);
    const ore = Math.floor(ms % 86400000 / 3600000);
    const min = Math.floor(ms % 3600000 / 60000);
    el.textContent = 'Mancano ' + giorni + (giorni === 1 ? ' giorno, ' : ' giorni, ') + ore + (ore === 1 ? ' ora e ' : ' ore e ') + min + (min === 1 ? ' minuto' : ' minuti') + ' a venerdì 13.';
  }
  aggiorna();
  setInterval(aggiorna, 60000);
})();

// ---------- Foto di sfondo (destinazioni e pony) ----------
// Gli elementi con data-bgfolder e data-bgname cercano la foto
// "cartella/nome.(jpg|jpeg|png|webp)" prima su Supabase, poi in locale (foto/cartella/nome.jpg).
const ESTENSIONI = ['jpg', 'jpeg', 'png', 'webp'];
const VELO = 'linear-gradient(180deg, rgba(42,13,59,.2), rgba(42,13,59,.85))';

function provaImmagine(url) {
  return new Promise(function (ok, no) {
    const img = new Image();
    img.onload = function () { ok(url); };
    img.onerror = no;
    img.src = url;
  });
}

async function applicaSfondo(el) {
  const file = el.dataset.bgfolder + '/' + el.dataset.bgname;
  const candidati = [];
  if (db) ESTENSIONI.forEach(function (ext) {
    candidati.push(db.storage.from('photos').getPublicUrl(file + '.' + ext).data.publicUrl);
  });
  ESTENSIONI.forEach(function (ext) { candidati.push('foto/' + file + '.' + ext); });
  for (const url of candidati) {
    try {
      await provaImmagine(url);
      el.style.backgroundImage = VELO + ', url("' + url + '")';
      return;
    } catch (e) { /* prossimo candidato */ }
  }
}
document.querySelectorAll('[data-bgfolder]').forEach(applicaSfondo);
