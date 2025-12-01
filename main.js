/* ---------------------------------
   DARK MODE TOGGLE
----------------------------------*/
const toggleDarkBtn = document.querySelector(".toggle-dark");
if (toggleDarkBtn){
    toggleDarkBtn.addEventListener("click", () => {
        document.body.classList.toggle("light");
        localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
    });
}

if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light");
}

/* ---------------------------------
   TEMP SONG STORAGE (Replace with API)
----------------------------------*/
let songs = JSON.parse(localStorage.getItem("songsDB")) || [];

/* ---------------------------------
   LOAD SONGS INTO GRIDS
----------------------------------*/
function loadSongsToGrid(){
    const grid = document.querySelector("#all-songs, #latest-songs");
    if (!grid) return;

    grid.innerHTML = "";

    songs.forEach((s, i) => {
        grid.innerHTML += `
        <div class="song-card fade" onclick="playSong(${i})">
            <img src="${s.cover}">
            <h4 class="song-title">${s.title}</h4>
            <p>${s.artist}</p>
        </div>
        `;
    });
}
loadSongsToGrid();

/* ---------------------------------
   ADVANCED PLAYER CONTROLS
----------------------------------*/
let currentIndex = 0;

function playSong(i){
    currentIndex = i;
    const s = songs[i];

    document.getElementById("player-cover").src = s.cover;
    document.getElementById("player-title").textContent = s.title;
    document.getElementById("player-artist").textContent = s.artist;

    const audio = document.getElementById("main-player");
    audio.src = s.file;
    audio.play();
}

/* Next/Prev */
function nextSong(){
    currentIndex = (currentIndex + 1) % songs.length;
    playSong(currentIndex);
}
function prevSong(){
    currentIndex = (currentIndex - 1 + songs.length) % songs.length;
    playSong(currentIndex);
}

/* Play-Pause */
function togglePlay(){
    const audio = document.getElementById("main-player");
    audio.paused ? audio.play() : audio.pause();
}

/* ---------------------------------
   ADMIN PANEL FUNCTIONS
----------------------------------*/
function uploadSong(e){
    e.preventDefault();

    const data = {
        title: title.value,
        artist: artist.value,
        cover: URL.createObjectURL(cover.files[0]),
        file: URL.createObjectURL(songFile.files[0]),
        lyrics: lyrics.value
    };

    songs.push(data);
    localStorage.setItem("songsDB", JSON.stringify(songs));
    alert("Song uploaded!");
    location.reload();
}

function deleteSong(i){
    songs.splice(i, 1);
    localStorage.setItem("songsDB", JSON.stringify(songs));
    location.reload();
}

/* ---------------------------------
   ADMIN LOGIN
----------------------------------*/
function loginAdmin(e){
    e.preventDefault();

    const user = username.value;
    const pass = password.value;

    if (user === "admin" && pass === "admin123"){
        localStorage.setItem("adminLoggedIn", "true");
        window.location.href = "dashboard.html";
    } else {
        document.getElementById("login-error").textContent = "Invalid Login Details!";
    }
}

function logout(){
    localStorage.removeItem("adminLoggedIn");
    window.location.href = "login.html";
}