# Absen Overlay — Twitch Check-in via Streamer.bot

Overlay OBS yang menampilkan kartu "Attendance" setiap kali penonton melakukan check-in lewat Channel Point Reward di Twitch. Data dikirim dari Streamer.bot ke overlay lewat WebSocket, lalu ditampilkan dengan animasi pop-in/pop-out.

## Struktur File

| File                      | Fungsi                                                          |
| ------------------------- | --------------------------------------------------------------- |
| `index.html`              | Markup overlay + logika JS (koneksi WebSocket, antrian animasi) |
| `style.css`               | Styling kartu overlay (bisa diganti sesuai selera)              |
| Action C# di Streamer.bot | Mengambil data user saat redeem, lalu broadcast ke overlay      |

## Alur Kerja

1. Penonton me-redeem Channel Point Reward "Check-in" di Twitch.
2. Streamer.bot menjalankan **Action** yang berisi:
   - Sub-action **Get User Info for Target** (Twitch → User, Source Type: `User`) — mengambil foto profil penonton.
   - Sub-action **Execute C# Code** — menyusun data (nama, login, jumlah absen, foto profil) menjadi JSON dan mem-broadcast-nya lewat `CPH.WebsocketBroadcastJson`.
3. `index.html` yang di-load sebagai Browser Source di OBS menerima broadcast tersebut lewat `@streamerbot/client`, memasukkannya ke antrian, lalu menampilkan kartu dengan animasi.

## Setup di Streamer.bot

> ⚠️ Pastikan untuk backup data streamer.bot karena data jumlah absen yang diambil murni dari streamer.bot

### 1. WebSocket Server

Aktifkan di **Servers/Clients → WebSocket Server**, catat host & port-nya (default kode ini: `127.0.0.1:8081` — sesuaikan dengan port yang kamu set).

### 2. Reward Redemption

Buat/pilih Channel Point Reward di **Platforms → Twitch → Channel Point Rewards**, lalu:

- Aktifkan **Persist per User Counter** — supaya hitungan absen (`userCounter`) tidak reset saat Streamer.bot di-restart.
- Hubungkan reward ini ke sebuah Action baru.

### 3. Susunan Sub-action di Action

Urutan **wajib** seperti ini (dari atas ke bawah):

- **Get User Info for Target** (Twitch → User), Source Type = `%user%`
- **Execute C# Code** (isi kode di bawah)

> ⚠️ Kalau urutan terbalik, variabel `targetUserProfileImageUrl` akan selalu kosong saat dibaca C#.

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

atau bisa ambil dari file yang sudah ada di [sini](/main.cs)

**Catatan penamaan variabel Streamer.bot** (sering ketuker):

- `user` → nama tampilan, contoh `TwitchUser123`
- `userName` → login (huruf kecil), contoh `twitchuser123`
- `targetUserProfileImageUrl` → hanya terisi kalau sub-action "Get User Info for Target" sudah jalan duluan

## Setup di OBS

1. Tambahkan **Browser Source** baru.
2. Arahkan ke lokasi lokal `index.html` (Local File), atau host filenya lalu isi URL.
3. Set ukuran sesuai kebutuhan (mis. 700×400) dan centang **Shutdown source when not visible: OFF** supaya koneksi WebSocket tidak putus-nyambung.
4. Background sudah transparan by default (`background: transparent` di CSS).

## Konfigurasi di `index.html`

Edit bagian `KONFIGURASI` di script sesuai kebutuhan:

```js
const STREAMERBOT_HOST = "127.0.0.1";
const STREAMERBOT_PORT = 8081; // samakan dengan port WebSocket Server di Streamer.bot
const DISPLAY_DURATION_MS = 4000; // lama kartu tampil di layar
const POPOUT_DURATION_MS = 500; // harus sama dengan durasi animasi popOut di CSS
const FALLBACK_AVATAR = "..."; // dipakai kalau foto profil gagal dimuat
```

## Troubleshooting

| Gejala                                       | Kemungkinan Penyebab                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Kartu langsung terlihat sebelum ada check-in | `opacity` dasar di CSS tidak 0 — pastikan `.card-container` mulai dari `opacity: 0`                                      |
| Foto profil selalu fallback                  | Sub-action "Get User Info for Target" belum ada / salah urutan / Source Type salah                                       |
| Nama tampil huruf kecil semua                | Salah pakai arg `userName` untuk display name — gunakan `user` untuk display name, `userName` untuk login                |
| Hitungan absen reset sendiri                 | Opsi **Persist per User Counter** belum dicentang di reward                                                              |
| Hitungan absen tercampur antar reward        | `userCounter` bersifat per-reward; kalau check-in dipicu dari beberapa reward berbeda, hitungannya tidak akan tergabung  |
| Overlay tidak terhubung ke Streamer.bot      | Cek `STREAMERBOT_HOST`/`STREAMERBOT_PORT` cocok dengan setting WebSocket Server, dan WebSocket Server dalam status aktif |

## Lisensi

Bebas dipakai dan dimodifikasi untuk keperluan streaming pribadi.
