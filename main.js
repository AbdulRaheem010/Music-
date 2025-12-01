const API_BASE = 'https://music-library-backend.onrender.com';

/* ================== DOM ELEMENTS ================== */
const songsContainer = document.getElementById('songs-container');
const albumSongsContainer = document.getElementById('album-songs-container');
const newReleasesContainer = document.getElementById('new-releases-container');
const albumsContainer = document.getElementById('albums-container');

const audioPlayer = document.getElementById('audio-player');
const audioTitle = document.getElementById('audio-title');
const audioCover = document.getElementById('audio-cover');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');

/* ================== GLOBALS ================== */
let songs = [];
let currentSongIndex = 0;

/* ================== FETCH FUNCTIONS ================== */
async function fetchSongs() {
  if (!songsContainer) return;
  try {
    const res = await fetch(`${API_BASE}/api/songs`);
    songs = await res.json();
    renderSongs();
    if (songs.length > 0) loadSong(0);
  } catch(err){ songsContainer.innerHTML='<p>Failed to load songs.</p>'; }
}

async function fetchNewReleases() {
  if(!newReleasesContainer) return;
  try{
    const res = await fetch(`${API_BASE}/api/songs?sort=newest&limit=6`);
    const latest = await res.json();
    newReleasesContainer.innerHTML='';
    latest.forEach(song=>{
      const card=document.createElement('div');
      card.classList.add('song-card');
      card.innerHTML=`<img src="${song.coverPath?API_BASE+'/'+song.coverPath:'img/default-cover.png'}" alt="${song.title}"><h3>${song.title}</h3><p>${song.artist}</p>`;
      card.addEventListener('click',()=>{ loadSongById(song._id); window.location.href='music.html'; });
      newReleasesContainer.appendChild(card);
    });
  }catch(err){ newReleasesContainer.innerHTML='<p>Failed to load new releases.</p>'; }
}

async function fetchAlbums() {
  if(!albumsContainer) return;
  try{
    const res = await fetch(`${API_BASE}/api/albums`);
    const albums = await res.json();
    albumsContainer.innerHTML='';
    albums.forEach(album=>{
      const card=document.createElement('div');
      card.classList.add('album-card');
      card.innerHTML=`<img src="${album.coverPath?API_BASE+'/'+album.coverPath:'img/default-cover.png'}" alt="${album.name}"><h3>${album.name}</h3><p>${album.artist}</p>`;
      card.addEventListener('click',()=>{ window.location.href=`album.html?album=${encodeURIComponent(album.name)}`; });
      albumsContainer.appendChild(card);
    });
  }catch(err){ albumsContainer.innerHTML='<p>Failed to load albums.</p>'; }
}

/* ================== RENDER SONGS ================== */
function renderSongs() {
  if(!songsContainer) return;
  songsContainer.innerHTML='';
  songs.forEach((song,index)=>{
    const songEl=document.createElement('div');
    songEl.classList.add('song-item');
    songEl.innerHTML=`<img src="${song.coverPath?API_BASE+'/'+song.coverPath:'img/default-cover.png'}" class="song-cover"><div class="song-info"><h3>${song.title}</h3><p>${song.artist}</p></div><button class="play-song-btn" data-index="${index}">Play</button>`;
    songsContainer.appendChild(songEl);
  });
  document.querySelectorAll('.play-song-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{
      const index=parseInt(e.target.dataset.index);
      loadSong(index);
      playSong();
    });
  });
}

/* ================== AUDIO PLAYER ================== */
function loadSong(index){ currentSongIndex=index; const song=songs[index]; if(!song) return; audioPlayer.src=`${API_BASE}/${song.audioPath}`; audioTitle.textContent=song.title; audioCover.src=song.coverPath?`${API_BASE}/${song.coverPath}`:'img/default-cover.png'; }
function loadSongById(id){ const index=songs.findIndex(s=>s._id===id); if(index>=0) loadSong(index); }

function playSong(){ audioPlayer.play(); if(playBtn) playBtn.style.display='none'; if(pauseBtn) pauseBtn.style.display='inline'; }
function pauseSong(){ audioPlayer.pause(); if(playBtn) playBtn.style.display='inline'; if(pauseBtn) pauseBtn.style.display='none'; }
function nextSong(){ loadSong((currentSongIndex+1)%songs.length); playSong(); }
function prevSong(){ loadSong((currentSongIndex-1+songs.length)%songs.length); playSong(); }

if(playBtn) playBtn.addEventListener('click',playSong);
if(pauseBtn) pauseBtn.addEventListener('click',pauseSong);
if(nextBtn) nextBtn.addEventListener('click',nextSong);
if(prevBtn) prevBtn.addEventListener('click',prevSong);
if(audioPlayer) audioPlayer.addEventListener('ended',nextSong);

/* ================== ADMIN LOGIN ================== */
const loginForm = document.getElementById('admin-login-form');
if(loginForm){
  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const email=document.getElementById('email').value;
    const password=document.getElementById('password').value;
    const msg=document.getElementById('login-message');
    try{
      const res=await fetch(`${API_BASE}/api/auth/login`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });
      const data=await res.json();
      if(res.ok){ localStorage.setItem('token',data.token); window.location.href='dashboard.html'; }
      else msg.textContent=data.message||'Login failed';
    }catch(err){ msg.textContent='Error connecting to backend'; }
  });
}

/* ================== ADMIN UPLOAD ================== */
const uploadForm = document.getElementById('upload-form');
if(uploadForm){
  uploadForm.addEventListener('submit', async e=>{
    e.preventDefault();
    const formData = new FormData();
    formData.append('title',document.getElementById('title').value);
    formData.append('artist',document.getElementById('artist').value);
    formData.append('album',document.getElementById('album').value);
    formData.append('genre',document.getElementById('genre').value);
    formData.append('lyrics',document.getElementById('lyrics').value);
    formData.append('audio',document.getElementById('audio').files[0]);
    const cover=document.getElementById('cover').files[0];
    if(cover) formData.append('cover',cover);

    const msg=document.getElementById('upload-message');
    try{
      const res=await fetch(`${API_BASE}/api/songs`,{
        method:'POST',
        headers:{'Authorization':'Bearer '+localStorage.getItem('token')},
        body:formData
      });
      const data=await res.json();
      if(res.ok){ msg.textContent='Song uploaded successfully!'; uploadForm.reset(); }
      else msg.textContent=data.message||'Upload failed';
    }catch(err){ msg.textContent='Error connecting to backend'; }
  });
}

/* ================== INIT ================== */
fetchSongs();
fetchNewReleases();
fetchAlbums();