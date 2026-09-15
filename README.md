# Absen Overlay — Twitch Check-in via Streamer.bot

🇮🇩 Bahasa Indonesia | [🇬🇧 English](./README-en.md)

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/rekize)
[![Tako.id](https://img.shields.io/badge/Tako.id-Donate-FF6633?style=for-the-badge)](https://tako.id/rekize)

Overlay OBS yang menampilkan kartu "Attendance" setiap kali penonton melakukan check-in lewat Channel Point Reward di Twitch. Data dikirim dari Streamer.bot ke overlay lewat WebSocket, lalu ditampilkan dengan animasi pop-in/pop-out.

## Prasyarat

- **Streamer.bot** (versi terbaru) sudah terinstall dan tersambung ke akun Twitch broadcaster/moderator.
- **Channel Points** aktif di channel Twitch kamu (butuh status Affiliate/Partner — akun non-affiliate tidak punya fitur ini).
- **OBS Studio** (atau software lain yang mendukung Browser Source, mis. Streamlabs) — pakai versi yang cukup baru supaya opsi **Control audio via OBS** tersedia kalau mau pakai fitur suara notifikasi.
- **Koneksi internet aktif** di komputer yang menjalankan OBS, karena `index.html` memuat library `@streamerbot/client` dari CDN (`unpkg.com`). Kalau internet OBS tidak stabil, download file itu sekali lalu simpan lokal (lihat catatan di `index.html`).
- **Koneksi internet saat pertama kali** menjalankan sub-action **Execute C# Code** di Streamer.bot — dibutuhkan untuk mengunduh compiler C# (Roslyn) kalau belum pernah dipakai sebelumnya.
- File audio notifikasi (`.mp3`/`.wav`/`.ogg`) — opsional, hanya kalau ingin pakai fitur suara di bagian [Suara Notifikasi](#suara-notifikasi).
- Tidak perlu keahlian coding — kode C# dan JS yang dipakai tinggal copy-paste, hanya perlu edit bagian konfigurasi.

## Struktur File

| File                                  | Fungsi                                                         |
| ------------------------------------- | -------------------------------------------------------------- |
| `index.html`                          | Markup overlay saja (memuat `style.css` dan `script.js`)       |
| `script.js`                           | Logika JS: koneksi WebSocket ke Streamer.bot, antrian, animasi |
| `style.css`                           | Styling kartu overlay (bisa diganti sesuai selera)             |
| `main.cs` / Action C# di Streamer.bot | Mengambil data user saat redeem, lalu broadcast ke overlay     |

## Alur Kerja

1. Penonton me-redeem Channel Point Reward "Check-in" di Twitch.
2. Streamer.bot menjalankan **Action** yang berisi:
   - Sub-action **Get User Info for Target** (Twitch → User) — mengambil foto profil penonton.
   - Sub-action **Execute C# Code** — menyusun data (nama, login, jumlah absen, foto profil) menjadi JSON dan mem-broadcast-nya lewat `CPH.WebsocketBroadcastJson`.
3. `index.html` (dengan `script.js` di dalamnya) yang di-load sebagai Browser Source di OBS menerima broadcast tersebut lewat `@streamerbot/client`, memasukkannya ke antrian, lalu menampilkan kartu dengan animasi.

## Setup di Streamer.bot

> ⚠️ Pastikan untuk backup data streamer.bot karena data jumlah absen yang diambil murni dari streamer.bot

### 1. WebSocket Server

Aktifkan di **Servers/Clients → WebSocket Server**, catat host & port-nya (default kode ini: `127.0.0.1:8081` — sesuaikan dengan port yang kamu set di `script.js`).

### 2. Reward Redemption

Buat/pilih Channel Point Reward di **Platforms → Twitch → Channel Point Rewards**, lalu:

- Aktifkan **Persist per User Counter** — supaya hitungan absen (`userCounter`) tidak reset saat Streamer.bot di-restart.
- Hubungkan reward ini ke sebuah Action baru.

### 3. Susunan Sub-action di Action

Urutan **wajib** seperti ini (dari atas ke bawah):

- **Get User Info for Target** (Twitch → User), Source Type = `%user%`
- **Execute C# Code** (isi kode di bawah)

> ⚠️ Kalau urutan terbalik, variabel `targetUserProfileImageUrl` akan selalu kosong saat dibaca C#.
>
> 💡 Kalau opsi **Source Type** punya pilihan bawaan `User` (tanpa perlu isi variabel apa pun), itu paling aman karena otomatis mengarah ke si penonton yang redeem. Kalau harus isi manual pakai variabel, gunakan `%userName%` (login, huruf kecil) — bukan `%user%` (nama tampilan) — karena API Twitch mencari profil berdasarkan login. Untuk sebagian besar akun keduanya kebetulan cocok, tapi bisa gagal pada akun dengan nama tampilan yang berbeda dari login aslinya (mis. pakai aksara lokal).

- **Kode C# (Execute C# Code)**

```csharp
using System;
using Newtonsoft.Json;

public class CPHInline
{
    public bool Execute()
    {
        if (!CPH.TryGetArg("user", out string userDisplayName) || string.IsNullOrWhiteSpace(userDisplayName))
        {
            CPH.LogWarn("Arg 'user' tidak ditemukan, action dibatalkan.");
            return false;
        }

        if (!CPH.TryGetArg("userName", out string userLogin) || string.IsNullOrWhiteSpace(userLogin))
        {
            CPH.LogWarn("Arg 'userName' (login) tidak ditemukan, action dibatalkan.");
            return false;
        }

        CPH.TryGetArg("targetUserProfileImageUrl", out string userProfile);

        // Counter bawaan reward, otomatis per user (butuh "Persist per User Counter" aktif)
        CPH.TryGetArg("userCounter", out int jumlahAbsen);

        var payload = new
        {
            type = "checkin",
            userName = userDisplayName,
            userLogin = userLogin,
            jumlahAbsen = jumlahAbsen,
            profileURL = userProfile
        };

        CPH.WebsocketBroadcastJson(JsonConvert.SerializeObject(payload));
        return true;
    }
}
```

atau bisa ambil dari file yang sudah ada di [sini](./main.cs)

**Catatan penamaan variabel Streamer.bot** (sering ketuker):

- `user` → nama tampilan, contoh `TwitchUser123`
- `userName` → login (huruf kecil), contoh `twitchuser123`
- `targetUserProfileImageUrl` → hanya terisi kalau sub-action "Get User Info for Target" sudah jalan duluan

## Setup di OBS

1. Tambahkan **Browser Source** baru.
2. Arahkan ke lokasi lokal `index.html` (Local File) — pastikan `script.js` dan `style.css` ada di folder yang sama, atau host ketiganya lalu isi URL.
3. Set ukuran sesuai kebutuhan (mis. 700×400) dan centang **Shutdown source when not visible: OFF** supaya koneksi WebSocket tidak putus-nyambung.
4. Background sudah transparan by default (`background: transparent` di CSS).

## Konfigurasi di `script.js`

Edit bagian `KONFIGURASI` di awal file sesuai kebutuhan:

```js
const STREAMERBOT_HOST = "127.0.0.1";
const STREAMERBOT_PORT = 8081; // samakan dengan port WebSocket Server di Streamer.bot
const DISPLAY_DURATION_MS = 4000; // lama kartu tampil di layar
const FALLBACK_AVATAR = "..."; // link gambar (300x300 pixel) dipakai kalau foto profil gagal dimuat
const NOTIF_SOUND_SRC = "notif.mp3"; // file audio, taruh di folder yang sama dengan index.html
const NOTIF_VOLUME = 0.7; // 0.0 (mute) - 1.0 (paling keras)
```

## Suara Notifikasi

Setiap kartu muncul, `script.js` otomatis memutar file audio yang diset di `NOTIF_SOUND_SRC` (format `.mp3`/`.wav`/`.ogg` semua didukung browser).

1. Taruh file audio (mis. `notif.mp3`) di folder yang sama dengan `index.html`, `script.js`, `style.css`.
2. Sesuaikan `NOTIF_SOUND_SRC` dan `NOTIF_VOLUME` di `script.js`.
3. Di OBS, buka **Properties** Browser Source → centang **Control audio via OBS**. Tanpa ini, suara tetap main tapi tidak tertangkap sebagai audio track terpisah di mixer OBS (bisa saja tidak terdengar penonton, tergantung setup audio kamu).
4. Cek **Audio Mixer → ⚙️ (Advanced Audio Properties)** pada source ini, atur **Audio Monitoring** ke `Monitor and Output` kalau kamu juga ingin dengar suaranya lewat speaker sendiri saat live.

## Troubleshooting

| Kendala                                      | Kemungkinan Penyebab                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Kartu langsung terlihat sebelum ada check-in | `opacity` dasar di CSS tidak 0 — pastikan `.card-container` mulai dari `opacity: 0`                                           |
| Foto profil selalu fallback                  | Sub-action "Get User Info for Target" belum ada / salah urutan / Source Type salah                                            |
| Nama tampil huruf kecil semua                | Salah pakai arg `userName` untuk display name — gunakan `user` untuk display name, `userName` untuk login                     |
| Hitungan absen reset sendiri                 | Opsi **Persist per User Counter** belum dicentang di reward                                                                   |
| Hitungan absen tercampur antar reward        | `userCounter` bersifat per-reward; kalau check-in dipicu dari beberapa reward berbeda, hitungannya tidak akan tergabung       |
| Overlay tidak terhubung ke Streamer.bot      | Cek `STREAMERBOT_HOST`/`STREAMERBOT_PORT` di `script.js` cocok dengan setting WebSocket Server, dan server dalam status aktif |
| Suara notifikasi tidak terdengar di stream   | **Control audio via OBS** belum dicentang di Properties Browser Source, atau `NOTIF_SOUND_SRC` salah nama file/path           |

## Kalau ga mau ribet

### 1. Setup di streamer.bot

- Download zip dari repo ini -> ekstrak

### 2. Copas yang ada di file [`import.txt`](/import.txt) ke streamer.bot

- Di streamer.bot -> klik **Import** -> lalu paste -> klik **Import**

### 3. Membuat redeem

- Buat rewards-nya di streamer.bot
  - Klik Platform pada sidebar -> **Channel point rewards**, lalu _double click_ pada reward yang diinginkan
  - Aktifkan opsi **Presist User Count** -> klik **Save**

- Ganti redeem-nya jadi yang diinginkan

## Dukung Project Ini

Project ini dibuat dan dirawat secara gratis. Kalau overlay-nya membantu stream kamu dan ingin traktir kopi:

- ☕ **Ko-fi** — [ko-fi.com/rekize](https://ko-fi.com/rekize)
- 🎁 **Tako.id** — [tako.id/rekize](https://tako.id/rekize)

Setiap dukungan sangat berarti buat pengembangan fitur berikutnya 🙏

## Lisensi

Bebas dipakai dan dimodifikasi untuk keperluan streaming pribadi.
