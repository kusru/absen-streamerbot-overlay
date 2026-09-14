    // ====== KONFIGURASI ======
    // pastikan sama persis dengan port di WebSocket Server Streamer.bot
    const STREAMERBOT_HOST = '127.0.0.1';
    const STREAMERBOT_PORT = 8081; 

    // lama kartu tampil ( dalam mili detik) sebelum animasi keluar
    const DISPLAY_DURATION_MS = 4000;

    // avatar default kalau tidak ada URL
    const FALLBACK_AVATAR = "https://placehold.co/300x300?text=No+Image";

    // ====== KONEKSI KE STREAMER.BOT ======
    // Payload custom ini dikirim dari Streamer.bot lewat CPH.WebsocketBroadcastJson,
    // sudah digabung dengan global variable di sisi C#
    const client = new StreamerbotClient({
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
      // jadi tidak perlu fetch API pihak ketiga lagi.
      document.getElementById("avatar").src =
        profileURL && profileURL.startsWith("http") ? profileURL : FALLBACK_AVATAR;

      // 3. Animasi masuk
      card.classList.remove("animate-in", "animate-out");
      void card.offsetWidth; // force reflow biar animasi bisa berulang
      card.classList.add("animate-in");

      // 4. Tampil selama DISPLAY_DURATION_MS
      await wait(DISPLAY_DURATION_MS);

      // 5. Animasi keluar
      card.classList.remove("animate-in");
      card.classList.add("animate-out");

      // 6. Tunggu animasi keluar selesai sebelum lanjut ke antrian berikutnya
      await wait(500);
    }