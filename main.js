/* main.js - unified frontend script for Get Vibes
   Works across index.html, music.html, album.html, admin pages.
   Make sure API_BASE points to your backend.
*/
const API_BASE = 'https://music-library-backend.onrender.com';

/* ---------- helper utils ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const fmt = s => {
  if (!s || isNaN(s)) return '00:00';
  const m = Math.floor(s/60), sec = Math.floor(s%60);
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};
const escapeHtml = str => String(str||'').replace(/[&<>"'`]/g, s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'})[s]);

/* ---------- player elements ---------- */
const pfCover = $('#pf-cover');
const pfTitle = $('#pf-title');
const pfArtist = $('#pf-artist');
const pfPlay = $('#pf-play');
const pfPause = $('#pf-pause');
const pfPrev = $('#pf-prev');
const pfNext = $('#pf-next');
const pfSeek = $('#pf-seek');
const pfCurrent = $('#pf-current');
const pfDuration = $('#pf-duration');
const audio = new Audio(); audio.crossOrigin = "anonymous";

/* ---------- state ---------- */
let songs = []; // cached songs
let currentIndex = -1;

/* ---------- fetch & render: home (new releases + albums) ---------- */
async function loadNewReleases(limit = 6){
  const container = $('#new-releases');
  if(!container) return;
  try{
    const res = await fetch(`${API_BASE}/api/songs?sort=newest&limit=${limit}`);
    const list = await res.json();
    container.innerHTML = list.map(s => `
      <div class="card" data-id="${s._id}">
        <img src="${s.coverPath || 'img/default-cover.png'}" alt="">
        <div class="card-body">
          <div class="card-title">${escapeHtml(s.title)}</div>
          <div class="card-sub">${escapeHtml(s.artist || 'Unknown')}</div>
        </div>
      </div>
    `).join('');
    // attach events
    $$('#new-releases .card').forEach(el=>{
      el.addEventListener('click', ()=>{ const id = el.dataset.id; loadAndPlayById(id); window.location.href = 'music.html'; });
    });
  }catch(e){ if(container) container.innerHTML = '<p class="muted">Unable to load new releases.</p>'; }
}

async function loadFeaturedAlbums(){
  const container = $('#featured-albums');
  if(!container) return;
  try{
    const res = await fetch(`${API_BASE}/api/songs/albums`);
    const list = await res.json();
    container.innerHTML = list.map(a => `
      <div class="card" data-album="${encodeURIComponent(a.name)}">
        <img src="${a.coverPath || 'img/default-cover.png'}" alt="">
        <div class="card-body">
          <div class="card-title">${escapeHtml(a.name || 'Untitled')}</div>
          <div class="card-sub">${escapeHtml(a.artist || '')}</div>
        </div>
      </div>
    `).join('');
    $$('#featured-albums .card').forEach(el=>{
      el.addEventListener('click', ()=>{ const album = decodeURIComponent(el.dataset.album); window.location.href = `album.html?album=${encodeURIComponent(album)}`; });
    });
  }catch(e){ if(container) container.innerHTML = '<p class="muted">Unable to load albums.</p>'; }
}

/* ---------- music page: all songs ---------- */
async function loadAllSongs(){
  const grid = $('#songs-grid');
  if(!grid) return;
  try{
    const res = await fetch(`${API_BASE}/api/songs`);
    songs = await res.json();
    $('#songs-count') && ($('#songs-count').textContent = `${songs.length} songs`);
    grid.innerHTML = songs.map((s,i)=>`
      <div class="song-item">
        <img class="song-cover" src="${s.coverPath || 'img/default-cover.png'}" alt="">
        <div class="song-meta">
          <div class="song-title">${escapeHtml(s.title)}</div>
          <div class="song-artist muted">${escapeHtml(s.artist || 'Unknown')}</div>
        </div>
        <div class="song-actions"><button class="btn primary play-btn" data-index="${i}">Play</button></div>
      </div>
    `).join('');
    $$('.play-btn').forEach(btn => btn.addEventListener('click', e => {
      const idx = Number(e.currentTarget.dataset.index); loadAndPlay(idx);
    }));
  }catch(e){ if(grid) grid.innerHTML = '<p class="muted">Unable to load songs.</p>'; }
}

/* ---------- album page ---------- */
async function loadAlbum(){
  const titleEl = $('#album-title');
  const infoEl = $('#album-info');
  const songsEl = $('#album-songs');
  if(!songsEl) return;
  const albumParam = new URLSearchParams(location.search).get('album');
  if(!albumParam){ songsEl.innerHTML = '<p class="muted">No album specified.</p>'; return; }
  const albumName = decodeURIComponent(albumParam);
  titleEl && (titleEl.textContent = albumName);
  try{
    const res = await fetch(`${API_BASE}/api/songs`);
    const all = await res.json();
    const albumSongs = all.filter(s => (s.album||'').toLowerCase() === albumName.toLowerCase());
    if(albumSongs.length){
      infoEl.innerHTML = `<img src="${albumSongs[0].coverPath || 'img/default-cover.png'}" alt=""><div class="album-meta"><h3>${escapeHtml(albumName)}</h3><div class="muted">${escapeHtml(albumSongs[0].artist || '')}</div></div>`;
      songsEl.innerHTML = albumSongs.map(s=>`
        <div class="song-item">
          <img class="song-cover" src="${s.coverPath || 'img/default-cover.png'}">
          <div class="song-meta"><div class="song-title">${escapeHtml(s.title)}</div><div class="song-artist muted">${escapeHtml(s.artist)}</div></div>
          <div class="song-actions"><button class="btn primary play-btn" data-id="${s._id}">Play</button></div>
        </div>
      `).join('');
      $$('.play-btn').forEach(b => b.addEventListener('click', ev => {
        const id = ev.currentTarget.dataset.id; loadAndPlayById(id);
      }));
    } else songsEl.innerHTML = '<p class="muted">No tracks in this album.</p>';
  }catch(e){ songsEl.innerHTML = '<p class="muted">Unable to load album.</p>'; }
}

/* ---------- player controls ---------- */
function attachPlayer(){
  audio.addEventListener('timeupdate', ()=> {
    pfSeek.value = audio.currentTime || 0;
    pfCurrent.textContent = fmt(audio.currentTime);
  });
  audio.addEventListener('loadedmetadata', ()=> {
    pfSeek.max = audio.duration || 0;
    pfDuration.textContent = fmt(audio.duration);
  });
  audio.addEventListener('ended', playNext);

  pfSeek && pfSeek.addEventListener('input', ()=> { audio.currentTime = Number(pfSeek.value); });
  pfPlay && pfPlay.addEventListener('click', ()=> { audio.play(); pfPlay.style.display='none'; pfPause.style.display='inline'; });
  pfPause && pfPause.addEventListener('click', ()=> { audio.pause(); pfPause.style.display='none'; pfPlay.style.display='inline'; });
  pfNext && pfNext.addEventListener('click', playNext);
  pfPrev && pfPrev.addEventListener('click', playPrev);
}

function loadAndPlay(index){
  if(index < 0 || index >= songs.length) return;
  currentIndex = index;
  const s = songs[index];
  audio.src = s.audioPath;
  pfCover.src = s.coverPath || 'img/default-cover.png';
  pfTitle.textContent = s.title;
  pfArtist.textContent = s.artist || 'Unknown';
  audio.play();
  pfPlay && (pfPlay.style.display='none');
  pfPause && (pfPause.style.display='inline');
}

async function loadAndPlayById(id){
  const idx = songs.findIndex(s => s._id === id);
  if(idx >= 0){ loadAndPlay(idx); return; }
  try{
    const res = await fetch(`${API_BASE}/api/songs/${id}`);
    const s = await res.json();
    songs.push(s);
    loadAndPlay(songs.length - 1);
  }catch(e){ console.error('load by id failed', e); }
}

function playNext(){ if(songs.length === 0) return; loadAndPlay((currentIndex + 1) % songs.length); }
function playPrev(){ if(songs.length === 0) return; loadAndPlay((currentIndex - 1 + songs.length) % songs.length); }

/* ---------- admin: login & upload ---------- */
function initAdminLogin(){
  const form = $('#admin-login-form'); if(!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#admin-email').value;
    const password = $('#admin-password').value;
    const msg = $('#login-message');
    try{
      const res = await fetch(`${API_BASE}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, password })});
      const data = await res.json();
      if(res.ok && data.token){ localStorage.setItem('token', data.token); window.location.href = 'dashboard.html'; }
      else msg.textContent = data.message || 'Login failed';
    }catch(err){ msg.textContent = 'Connection error'; }
  });
}

function initAdminUpload(){
  const form = $('#upload-form'); if(!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('#upload-message');
    const fd = new FormData();
    fd.append('title', $('#title').value);
    fd.append('artist', $('#artist').value);
    fd.append('album', $('#album').value);
    fd.append('genre', $('#genre').value);
    fd.append('lyrics', $('#lyrics').value);
    const audioFile = $('#audio').files[0];
    if(!audioFile){ msg.textContent = 'Select audio file'; return; }
    fd.append('audio', audioFile);
    const coverFile = $('#cover').files[0]; if(coverFile) fd.append('cover', coverFile);

    try{
      const res = await fetch(`${API_BASE}/api/songs`, { method:'POST', headers:{ 'Authorization':'Bearer '+localStorage.getItem('token') }, body: fd });
      const data = await res.json();
      if(res.ok){ msg.textContent = 'Uploaded ✓'; form.reset(); fetchUploadedList(); setTimeout(()=>msg.textContent='',2000); }
      else msg.textContent = data.message || 'Upload failed';
    }catch(err){ msg.textContent = 'Connection error'; }
  });
}

async function fetchUploadedList(){
  const container = $('#uploaded-list'); if(!container) return;
  try{
    const res = await fetch(`${API_BASE}/api/songs`);
    const list = await res.json();
    container.innerHTML = list.map(s => `<div class="song-row"><div>${escapeHtml(s.title)} — <span class="muted">${escapeHtml(s.artist||'Unknown')}</span></div><div><button class="btn" data-id="${s._id}">Delete</button></div></div>`).join('');
    $$('#uploaded-list .btn').forEach(b => b.addEventListener('click', async e => {
      const id = e.currentTarget.dataset.id; if(!confirm('Delete this track?')) return;
      const res = await fetch(`${API_BASE}/api/songs/${id}`, { method:'DELETE', headers:{ 'Authorization':'Bearer '+localStorage.getItem('token') }});
      if(res.ok) fetchUploadedList(); else alert('Delete failed');
    }));
  }catch(e){ container.innerHTML = '<p class="muted">Unable to load.</p>'; }
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  attachPlayer();
  // home
  loadNewReleases();
  loadFeaturedAlbums();
  // music
  loadAllSongs();
  // album
  loadAlbum();
  // admin
  initAdminLogin();
  initAdminUpload();
  fetchUploadedList();

  // theme toggle
  $$('#theme-toggle, #theme-toggle-2, #theme-toggle-3').forEach(btn=>{
    if(btn) btn.addEventListener('click', ()=> document.body.classList.toggle('light-mode'));
  });
});
