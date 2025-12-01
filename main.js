/**
 * main.js - unified frontend script for Get Vibes
 * - works for index.html, music.html, album.html, admin pages
 * - uses API_BASE to call backend (Render)
 */

const API_BASE = 'https://music-library-backend.onrender.com'; // << your backend

/* ---------- DOM refs (player) ---------- */
const pfCover = document.getElementById('pf-cover');
const pfTitle = document.getElementById('pf-title');
const pfArtist = document.getElementById('pf-artist');
const pfPlay = document.getElementById('pf-play');
const pfPause = document.getElementById('pf-pause');
const pfPrev = document.getElementById('pf-prev');
const pfNext = document.getElementById('pf-next');
const pfSeek = document.getElementById('pf-seek');
const pfCurrent = document.getElementById('pf-current');
const pfDuration = document.getElementById('pf-duration');
const audioEl = document.createElement('audio'); // centralized audio element

/* ---------- State ---------- */
let songs = [];           // list of songs from backend
let currentIndex = -1;    // currently playing index

/* ---------- Utility ---------- */
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));
const fmtTime = (s) => {
  if (!s || isNaN(s)) return '00:00';
  const m = Math.floor(s/60); const sec = Math.floor(s%60);
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

/* ---------- Fetch & Render (Home) ---------- */
async function loadNewReleases(limit=6){
  const container = document.getElementById('new-releases');
  if(!container) return;
  try {
    const res = await fetch(`${API_BASE}/api/songs?sort=newest&limit=${limit}`);
    const list = await res.json();
    container.innerHTML = list.map(s => `
      <div class="card" data-id="${s._id}">
        <img src="${s.coverPath||'img/default-cover.png'}" alt="">
        <div class="card-body">
          <div class="card-title">${escapeHtml(s.title)}</div>
          <div class="card-sub">${escapeHtml(s.artist||'Unknown')}</div>
        </div>
      </div>
    `).join('');
    // attach click handlers
    qsa('#new-releases .card').forEach(el => el.addEventListener('click', ()=>{
      const id = el.dataset.id; loadAndPlayById(id); window.location.href='music.html';
    }));
  } catch(e){ container.innerHTML = '<p class="muted">Unable to load new releases.</p>'; }
}

async function loadFeaturedAlbums(){
  const container = document.getElementById('featured-albums');
  if(!container) return;
  try {
    const res = await fetch(`${API_BASE}/api/songs/albums`);
    const albums = await res.json();
    // fallback if route different: try /api/songs/albums
    container.innerHTML = albums.map(a => `
      <div class="card" data-album="${encodeURIComponent(a.name)}">
        <img src="${a.coverPath||'img/default-cover.png'}" alt="">
        <div class="card-body">
          <div class="card-title">${escapeHtml(a.name || 'Untitled')}</div>
          <div class="card-sub">${escapeHtml(a.artist || '')}</div>
        </div>
      </div>
    `).join('');
    qsa('#featured-albums .card').forEach(el => el.addEventListener('click', ()=>{
      const album = decodeURIComponent(el.dataset.album);
      window.location.href = `album.html?album=${encodeURIComponent(album)}`;
    }));
  } catch(e){ container.innerHTML = '<p class="muted">Unable to load albums.</p>'; }
}

/* ---------- Music Page: fetch all songs and render ---------- */
async function fetchAllSongs(){
  const grid = document.getElementById('songs-grid');
  if(!grid) return;
  try{
    const res = await fetch(`${API_BASE}/api/songs`);
    songs = await res.json();
    document.getElementById('songs-count').textContent = `${songs.length} songs`;
    grid.innerHTML = songs.map((s,i) => `
      <div class="song-item">
        <img class="song-cover" src="${s.coverPath||'img/default-cover.png'}" alt="">
        <div class="song-meta">
          <div class="song-title">${escapeHtml(s.title)}</div>
          <div class="song-artist muted">${escapeHtml(s.artist||'Unknown')}</div>
        </div>
        <div class="song-actions">
          <button class="btn play-btn" data-index="${i}">Play</button>
        </div>
      </div>
    `).join('');
    qsa('.play-btn').forEach(b => b.addEventListener('click', (ev)=>{
      const idx = Number(ev.currentTarget.dataset.index); loadAndPlay(idx);
    }));
  }catch(e){ grid.innerHTML = '<p class="muted">Unable to load songs.</p>'; }
}

/* ---------- Album page: render songs in album ---------- */
async function loadAlbumFromQuery(){
  const albumParam = new URLSearchParams(location.search).get('album');
  if(!albumParam) return;
  const titleEl = document.getElementById('album-title');
  const infoEl = document.getElementById('album-info');
  const songsEl = document.getElementById('album-songs');
  try{
    const res = await fetch(`${API_BASE}/api/songs`);
    const all = await res.json();
    const albumName = decodeURIComponent(albumParam);
    const albumSongs = all.filter(s => (s.album || '').toLowerCase() === albumName.toLowerCase());
    titleEl.textContent = albumName;
    if(albumSongs.length){
      infoEl.innerHTML = `
        <img src="${albumSongs[0].coverPath||'img/default-cover.png'}" alt="">
        <div class="album-meta">
          <h3>${escapeHtml(albumName)}</h3>
          <div class="muted">${escapeHtml(albumSongs[0].artist||'Various Artists')}</div>
        </div>
      `;
      songsEl.innerHTML = albumSongs.map((s,i)=>`
        <div class="song-item">
          <img class="song-cover" src="${s.coverPath||'img/default-cover.png'}">
          <div class="song-meta"><div class="song-title">${escapeHtml(s.title)}</div><div class="song-artist muted">${escapeHtml(s.artist)}</div></div>
          <div class="song-actions"><button class="btn play-btn" data-id="${s._id}">Play</button></div>
        </div>
      `).join('');
      qsa('.play-btn').forEach(b=>b.addEventListener('click',ev=>{
        const id = ev.currentTarget.dataset.id;
        loadAndPlayById(id);
      }));
    } else {
      songsEl.innerHTML = '<p class="muted">No tracks in this album.</p>';
    }
  }catch(e){ infoEl.innerHTML=''; songsEl.innerHTML='<p class="muted">Unable to load album.</p>'; }
}

/* ---------- Player controls ---------- */
function attachPlayerListeners(){
  // update time
  audioEl.addEventListener('timeupdate', ()=>{
    pfSeek.value = audioEl.currentTime || 0;
    pfCurrent.textContent = fmtTime(audioEl.currentTime);
  });
  audioEl.addEventListener('loadedmetadata', ()=>{
    pfSeek.max = audioEl.duration || 0;
    pfDuration.textContent = fmtTime(audioEl.duration);
  });
  audioEl.addEventListener('ended', ()=>{ playNext(); });

  // seek input
  if(pfSeek) pfSeek.addEventListener('input', ()=>{ audioEl.currentTime = Number(pfSeek.value); });

  // play/pause
  if(pfPlay) pfPlay.addEventListener('click', ()=>{ audioEl.play(); pfPlay.style.display='none'; pfPause.style.display='inline'; });
  if(pfPause) pfPause.addEventListener('click', ()=>{ audioEl.pause(); pfPause.style.display='none'; pfPlay.style.display='inline'; });
  if(pfNext) pfNext.addEventListener('click', playNext);
  if(pfPrev) pfPrev.addEventListener('click', playPrev);
}

/* ---------- Play helpers ---------- */
function loadAndPlay(index){
  if(index<0 || index>=songs.length) return;
  currentIndex = index;
  const s = songs[index];
  audioEl.src = s.audioPath; // cloudinary or backend URL must be full
  pfCover.src = s.coverPath || 'img/default-cover.png';
  pfTitle.textContent = s.title;
  pfArtist.textContent = s.artist || 'Unknown';
  audioEl.play();
  if(pfPlay) pfPlay.style.display='none';
  if(pfPause) pfPause.style.display='inline';
}
async function loadAndPlayById(id){
  // find in songs array, otherwise fetch single
  const idx = songs.findIndex(s=>s._id===id);
  if(idx>=0){ loadAndPlay(idx); return }
  try{
    const res = await fetch(`${API_BASE}/api/songs/${id}`);
    const s = await res.json();
    // temporarily push to songs list
    songs.push(s);
    loadAndPlay(songs.length-1);
  }catch(e){ console.error('loadById failed',e); }
}
function playNext(){ if(songs.length===0) return; loadAndPlay((currentIndex+1)%songs.length); }
function playPrev(){ if(songs.length===0) return; loadAndPlay((currentIndex-1+songs.length)%songs.length); }

/* ---------- Admin: login & upload ---------- */
function adminLoginHandler(){
  const form = document.getElementById('admin-login-form');
  if(!form) return;
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const email = document.getElementById('admin-email').value;
    const password = document.getElementById('admin-password').value;
    const msg = document.getElementById('login-message');
    try{
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password})
      });
      const data = await res.json();
      if(res.ok && data.token){ localStorage.setItem('token', data.token); window.location.href='dashboard.html'; }
      else msg.textContent = data.message || 'Login failed';
    }catch(err){ msg.textContent='Connection error'; }
  });
}

function adminUploadHandler(){
  const form = document.getElementById('upload-form');
  if(!form) return;
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const msg = document.getElementById('upload-message');
    const fd = new FormData();
    fd.append('title', document.getElementById('title').value);
    fd.append('artist', document.getElementById('artist').value);
    fd.append('album', document.getElementById('album').value);
    fd.append('genre', document.getElementById('genre').value);
    fd.append('lyrics', document.getElementById('lyrics').value);
    const audioFile = document.getElementById('audio').files[0];
    if(!audioFile){ msg.textContent='Select an audio file'; return; }
    fd.append('audio', audioFile);
    const coverFile = document.getElementById('cover').files[0];
    if(coverFile) fd.append('cover', coverFile);

    try{
      const res = await fetch(`${API_BASE}/api/songs`, {
        method:'POST',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
        body: fd
      });
      const data = await res.json();
      if(res.ok){ msg.textContent='Uploaded ✓'; setTimeout(()=>msg.textContent='',2500); fetchUploadedList(); }
      else msg.textContent = data.message || 'Upload failed';
    }catch(err){ msg.textContent='Connection error'; }
  });
}

async function fetchUploadedList(){
  const container = document.getElementById('uploaded-list');
  if(!container) return;
  try{
    const res = await fetch(`${API_BASE}/api/songs`);
    const list = await res.json();
    container.innerHTML = list.map(s=> `
      <div class="song-row">
        <div>${escapeHtml(s.title)} — <span class="muted">${escapeHtml(s.artist||'Unknown')}</span></div>
        <div><button class="btn" data-id="${s._id}">Delete</button></div>
      </div>
    `).join('');
    qsa('#uploaded-list .btn').forEach(b=>b.addEventListener('click',async e=>{
      const id = e.currentTarget.dataset.id;
      if(!confirm('Delete this track?')) return;
      const res = await fetch(`${API_BASE}/api/songs/${id}`, { method:'DELETE', headers:{ 'Authorization':'Bearer '+localStorage.getItem('token') }});
      if(res.ok) fetchUploadedList();
      else alert('Delete failed');
    }));
  }catch(e){ container.innerHTML='<p class="muted">Unable to load.</p>'; }
}

/* ---------- Helpers ---------- */
function escapeHtml(str=''){ return String(str).replace(/[&<>"'`]/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;', '`':'&#96;' })[s]); }

/* ---------- Init on DOM ready ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  attachPlayerListeners();
  // Home page:
  loadNewReleases();
  loadFeaturedAlbums();
  // Music page:
  fetchAllSongs();
  // Album page:
  loadAlbumFromQuery();
  // Admin:
  adminLoginHandler();
  adminUploadHandler();
  fetchUploadedList();

  // Theme toggle (simple)
  qsa('#theme-toggle, #theme-toggle-2, #theme-toggle-3').forEach(btn=>{
    btn?.addEventListener('click', ()=>{ document.body.classList.toggle('light-mode'); });
  });
});