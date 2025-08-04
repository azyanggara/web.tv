//const SHEET_JSON_URL = "https://script.google.com/macros/s/AKfycbzDVxRw0wpHifSZ8hOowA_aGUUp0o6wptU2ec0hE1rdCOFXySXJs-nUBz5ow4L26PIh/exec";
const SHEET_JSON_URL = "data/m3u8.json";

let channels = [];
let activeCategory = null;
let hls;

const categoriesEl = document.getElementById('categories');
const channelListEl = document.getElementById('channel-list');
const playerContainer = document.getElementById('player-container');
const playerTitle = document.getElementById('player-title');
const videoPlayer = document.getElementById('video-player');

async function fetchChannels() {
  try {
    const resp = await fetch(SHEET_JSON_URL);
    channels = await resp.json();
    console.table(channels); // Debug: tampilkan isi JSON
    renderCategories();
    renderChannels();
  } catch(err) {
    console.error(err);
    alert('Gagal memuat data channel silahkan klik tombol refresh');
  }
}

function renderCategories() {
  const categories = [...new Set(channels.map(ch => ch.category))];
  categoriesEl.innerHTML = '';
  ['ALL', ...categories].forEach(cat => {
    const btn = document.createElement('button');
    btn.textContent = cat;
    btn.className = `px-4 py-1 rounded-full text-sm ${
      (cat === activeCategory || (cat==='ALL' && !activeCategory))
      ? 'bg-blue-500 text-white' : 'bg-gray-700 hover:bg-gray-600'}`;
      btn.onclick = () => {
        activeCategory = cat === 'ALL' ? null : cat;
        renderChannels();
        renderCategories();
      };
      categoriesEl.appendChild(btn);
    });
}

function renderChannels() {
  channelListEl.innerHTML = '';
  channels.filter(ch => !activeCategory || ch.category === activeCategory)
  .forEach(ch => {
    const div = document.createElement('div');
    div.className = 'bg-gray-800 p-3 rounded-lg cursor-pointer hover:bg-gray-700';
    div.innerHTML = `<img src="${ch.logo}" alt="${ch.name}" class="w-full h-24 object-contain mb-2" />
    <p class="text-center font-medium text-sm">${ch.name}</p>`;
    div.onclick = () => playChannel(ch);
    channelListEl.appendChild(div);
  });
}

function playChannel(channel) {
  playerTitle.textContent = `Sedang Memutar: ${channel.name}`;
  playerContainer.classList.remove('hidden');

  if (hls) hls.destroy();

  const streamUrl = channel.useProxy
  ? "http://localhost:8800/proxy?url=" + encodeURIComponent(channel.url)
  : channel.url;

  console.log("🔁 Memutar:", streamUrl);

  if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(streamUrl);
    hls.attachMedia(videoPlayer);
  } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
    videoPlayer.src = streamUrl;
  } else {
    alert('Browser tidak mendukung m3u8');
  }

  requestWakeLock();
}

function closePlayer() {
  playerContainer.classList.add('hidden');
  if (hls) hls.destroy();
  videoPlayer.pause();
}

fetchChannels();

let wakeLock = null;

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      console.log("✅ Wake Lock aktif");

      document.addEventListener("visibilitychange", async () => {
        if (wakeLock !== null && document.visibilityState === "visible") {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      });
    } else {
      console.warn("⚠️ Wake Lock API tidak tersedia di browser ini");
    }
  } catch (err) {
    console.error(`WakeLock error: ${err.name}, ${err.message}`);
  }
}
