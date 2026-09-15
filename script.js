// ====== KONFIGURASI ======
const STREAMERBOT_HOST = '127.0.0.1';
const STREAMERBOT_PORT = 8081; // pastikan sama persis dengan port di WebSocket Server Streamer.bot

const DISPLAY_DURATION_MS = 4000; // lama kartu tampil

const FALLBACK_AVATAR = "https://placehold.co/300x300?text=No+Image"; // avatar default kalau tidak ada foto profil

const CHECKIN_LABEL = "Attendance"; // label untuk event check-in
const WATCHSTREAK_LABEL = "Watch Streak";   // label untuk event watch streak

const CHECKIN_SUMMARY = (absen) => `Telah Check-in ke-${absen} kalinya.`; // ringkasan untuk event check-in
const WATCHSTREAK_SUMMARY = (streak) => ` 🔥 Watch Streak ke-${streak}!`; // ringkasan untuk event watch streak

const NOTIF_SOUND_SRC = "sound.mp3"; // taruh file audio di folder yang sama dengan index.html
const NOTIF_VOLUME = 0.7;            // 0.0 (mute) - 1.0 (paling keras)

// Preload sekali di awal biar tidak ada jeda saat play pertama kali
const notifSound = new Audio(NOTIF_SOUND_SRC);
notifSound.volume = NOTIF_VOLUME;
notifSound.preload = "auto";

function playNotifSound() {
  // clone supaya kalau ada 2 check-in yang jaraknya rapat, suaranya tetap bisa tumpang tindih
  const sound = notifSound.cloneNode();
  sound.volume = NOTIF_VOLUME;
  sound.play().catch((err) => console.warn("Gagal memutar suara notifikasi:", err));
}

// ====== KONEKSI KE STREAMER.BOT ======
const client = new StreamerbotClient({
  host: STREAMERBOT_HOST,
  port: STREAMERBOT_PORT,
  subscribe: {
    General: ['Custom'],
    Twitch: ['WatchStreak']
  },
  onConnect: (info) => {
    console.log("Berhasil terhubung ke Streamer.bot!", info);
  },
  onDisconnect: () => {
    console.warn("Koneksi ke Streamer.bot terputus, mencoba menyambung ulang...");
  },
  onError: (err) => {
    console.error("Kesalahan koneksi Streamer.bot:", err);
  }
});

// ====== QUEUE SYSTEM ======
const redeemQueue = [];
let isProcessingQueue = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Handler Event Custom dari C# (Attendance Check / Absen)
client.on('General.Custom', ({ data }) => {
  if (data?.type !== 'checkin') return; // abaikan broadcast lain yang bukan event check-in

  console.log("Payload data redeem:", data);

  const name = data.userName || "Username";
  const jumlahAbsen = data.jumlahAbsen;
  const profileURL = data.profileURL;

  redeemQueue.push({ 
    type: 'checkin', 
    title: 'Attendance',
    name, 
    jumlahAbsen, 
    profileURL 
  });
  processQueue();
});

// Handler Event Watch Streak dari Twitch
client.on('Twitch.WatchStreak', ({ data }) => {
  console.log("Payload watch streak:", data);

  const name = data.user?.name || data.user?.login || "Viewer";
  const streakCount = data.streakCount;

  redeemQueue.push({ 
    type: 'watchstreak', 
    title: 'Watch Streak',
    name, 
    streakCount, 
    profileURL: data.user?.profileImageUrl || null 
  });
  processQueue();
});

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (redeemQueue.length > 0) {
    const item = redeemQueue.shift();
    await showRedemption(item);
  }

  isProcessingQueue = false;
}

// Menampilkan kartu UI ke layar
async function showRedemption({ type, title, name, jumlahAbsen, streakCount, profileURL }) {
  const card = document.getElementById("overlayCard");

  // 1. Update Teks Nama
  document.getElementById("userName").innerText = name;

  // 2. Update Label Badge (Watch Streak / Attendance Check)
  const titleElement = document.getElementById("title");
  if (titleElement) {
    titleElement.innerText = title;
  }

  // 3. Update Teks Ringkasan (Summary)
  let summaryText;
  if (type === 'watchstreak') {
    summaryText = streakCount != null ? WATCHSTREAK_SUMMARY(streakCount) : "🔥 Watch Streak!";
  } else {
    summaryText = jumlahAbsen != null ? CHECKIN_SUMMARY(jumlahAbsen) : "Telah Check-in.";
  }
  document.getElementById("summary").innerText = summaryText;

  // 4. Update Foto profil
  const avatar = document.getElementById("avatar");
  avatar.onerror = function () {
    this.onerror = null;
    this.src = FALLBACK_AVATAR;
  };
  avatar.src = profileURL && profileURL.startsWith("http") ? profileURL : FALLBACK_AVATAR;

  // 5. Animasi masuk + suara notifikasi
  card.classList.remove("animate-in", "animate-out");
  void card.offsetWidth;
  card.classList.add("animate-in");
  playNotifSound();

  // 6. Tampil selama DISPLAY_DURATION_MS
  await wait(DISPLAY_DURATION_MS);

  // 7. Animasi keluar
  card.classList.remove("animate-in");
  card.classList.add("animate-out");

  // 8. Tunggu animasi keluar selesai sebelum lanjut ke antrian berikutnya
  await wait(500);
}