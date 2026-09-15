// ====== KONFIGURASI ======
const STREAMERBOT_HOST = '127.0.0.1';
const STREAMERBOT_PORT = 8081; // pastikan sama persis dengan port di WebSocket Server Streamer.bot

const DISPLAY_DURATION_MS = 4000; // lama kartu tampil

const FALLBACK_AVATAR = "https://static-cdn.jtvnw.net/jtv_user_pictures/static/twal_cards_glitch.png";

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
// Sekarang dengarkan "General.Custom", bukan "Twitch.RewardRedemption" langsung.
// Payload custom ini dikirim dari Streamer.bot lewat CPH.WebsocketBroadcastJson,
// sudah digabung dengan global variable di sisi C# (lihat penjelasan terpisah).
const client = new StreamerbotClient({
  host: STREAMERBOT_HOST,
  port: STREAMERBOT_PORT,
  subscribe: {
    General: ['Custom']
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

client.on('General.Custom', ({ data }) => {
  if (data?.type !== 'checkin') return; // abaikan broadcast lain yang bukan event check-in

  console.log("Payload data redeem:", data);

  const name = data.userName || "Username";
  const jumlahAbsen = data.jumlahAbsen;
  const profileURL = data.profileURL;

  // Jangan langsung update DOM di sini.
  // Cukup dorong ke antrian, biar tidak saling menimpa.
  redeemQueue.push({ name, jumlahAbsen, profileURL });
  processQueue();
});

async function processQueue() {
  // Kalau sudah ada proses yang berjalan, biarkan dia yang lanjut ambil antrian berikutnya.
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (redeemQueue.length > 0) {
    const { name, jumlahAbsen, profileURL } = redeemQueue.shift();
    await showRedemption(name, jumlahAbsen, profileURL);
  }

  isProcessingQueue = false;
}

async function showRedemption(name, jumlahAbsen, profileURL) {
  const card = document.getElementById("overlayCard");

  // 1. Update Teks (termasuk global variable dari Streamer.bot)
  document.getElementById("userName").innerText = name;
  document.getElementById("summary").innerText =
    jumlahAbsen != null ? `Check-in ke-${jumlahAbsen}` : "Telah Check-in.";

  // 2. Foto profil sudah dikirim langsung oleh Streamer.bot (targetUserProfileImageUrl),
  // jadi tidak perlu fetch API pihak ketiga lagi. Fallback juga dipasang kalau URL-nya gagal dimuat.
  const avatar = document.getElementById("avatar");
  avatar.onerror = function () {
    this.onerror = null;
    this.src = FALLBACK_AVATAR;
  };
  avatar.src = profileURL && profileURL.startsWith("http") ? profileURL : FALLBACK_AVATAR;

  // 3. Animasi masuk + suara notifikasi
  card.classList.remove("animate-in", "animate-out");
  void card.offsetWidth;
  card.classList.add("animate-in");
  playNotifSound();

  // 4. Tampil selama DISPLAY_DURATION_MS
  await wait(DISPLAY_DURATION_MS);

  // 5. Animasi keluar
  card.classList.remove("animate-in");
  card.classList.add("animate-out");

  
  // 6. Tunggu animasi keluar selesai sebelum lanjut ke antrian berikutnya
  // (milisecondnya harus sama dengan durasi animasi popOut di CSS)
  await wait(500);
}
