# Absen Overlay — Twitch Check-in via Streamer.bot

[🇮🇩 Bahasa Indonesia](./README.md) | 🇬🇧 English

[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/rekize)
[![Tako.id](https://img.shields.io/badge/Tako.id-Donate-FF6633?style=for-the-badge)](https://tako.id/rekize)

An OBS overlay that shows an "Attendance" card every time a viewer checks in via a Twitch Channel Point Reward. Data is sent from Streamer.bot to the overlay over WebSocket and displayed with a pop-in/pop-out animation.

## Prerequisites

- **Streamer.bot** (latest version) installed and connected to your broadcaster/moderator Twitch account.
- **Channel Points** enabled on your Twitch channel (requires Affiliate/Partner status — non-affiliate accounts don't have this feature).
- **OBS Studio** (or any other software that supports Browser Source, e.g. Streamlabs) — use a reasonably recent version so the **Control audio via OBS** option is available if you want to use the notification-sound feature.
- **Active internet connection** on the machine running OBS, since `index.html` loads the `@streamerbot/client` library from a CDN (`unpkg.com`). If OBS's internet connection is unstable, download that file once and host it locally (see the note in `index.html`).
- **Internet connection the first time** you run the **Execute C# Code** sub-action in Streamer.bot — needed to download the C# compiler (Roslyn) if it hasn't been used before.
- A notification sound file (`.mp3`/`.wav`/`.ogg`) — optional, only needed if you want the sound feature described in [Notification Sound](#notification-sound).
- No coding expertise required — the C# and JS code here is copy-paste ready; you only need to edit the configuration section.

## File Structure

| File                                  | Purpose                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `index.html`                          | Overlay markup only (loads `style.css` and `script.js`)            |
| `script.js`                           | JS logic: WebSocket connection to Streamer.bot, queue, animation   |
| `style.css`                           | Overlay card styling (customize as you like)                       |
| `main.cs` / C# Action in Streamer.bot | Fetches user data on redemption, then broadcasts it to the overlay |

## How It Works

1. A viewer redeems the "Check-in" Channel Point Reward on Twitch.
2. Streamer.bot runs an **Action** containing:
   - **Get User Info for Target** sub-action (Twitch → User) — fetches the viewer's profile picture.
   - **Execute C# Code** sub-action — assembles the data (name, login, check-in count, profile picture) into JSON and broadcasts it via `CPH.WebsocketBroadcastJson`.
3. `index.html` (with `script.js`), loaded as a Browser Source in OBS, receives that broadcast through `@streamerbot/client`, pushes it into a queue, and shows the card with an animation.

## Streamer.bot Setup

> ⚠️ Make sure to back up your Streamer.bot data, since the check-in count is stored entirely inside Streamer.bot.

### 1. WebSocket Server

Enable it under **Servers/Clients → WebSocket Server**, and note the host & port (default in this code: `127.0.0.1:8081` — adjust to match the port you set in `script.js`).

### 2. Reward Redemption

Create/select a Channel Point Reward under **Platforms → Twitch → Channel Point Rewards**, then:

- Enable **Persist per User Counter** — so the check-in count (`userCounter`) doesn't reset when Streamer.bot restarts.
- Link this reward to a new Action.

### 3. Sub-action Order in the Action

The order **must** be as follows (top to bottom):

- **Get User Info for Target** (Twitch → User), Source Type = `%user%`
- **Execute C# Code** (code below)

> ⚠️ If the order is reversed, the `targetUserProfileImageUrl` variable will always be empty when read by the C# code.
>
> 💡 If the **Source Type** option has a built-in `User` choice (no variable needed), that's the safest option since it automatically resolves to the viewer who redeemed. If you have to enter a variable manually, use `%userName%` (login, lowercase) — not `%user%` (display name) — since the Twitch API looks up profiles by login. For most accounts the two happen to match, but it can fail for accounts whose display name differs from their actual login (e.g. using non-Latin characters).

- **C# Code (Execute C# Code)**

```csharp
using System;
using Newtonsoft.Json;

public class CPHInline
{
    public bool Execute()
    {
        if (!CPH.TryGetArg("user", out string userDisplayName) || string.IsNullOrWhiteSpace(userDisplayName))
        {
            CPH.LogWarn("Arg 'user' not found, action cancelled.");
            return false;
        }

        if (!CPH.TryGetArg("userName", out string userLogin) || string.IsNullOrWhiteSpace(userLogin))
        {
            CPH.LogWarn("Arg 'userName' (login) not found, action cancelled.");
            return false;
        }

        CPH.TryGetArg("targetUserProfileImageUrl", out string userProfile);

        // Built-in reward counter, automatically per user (requires "Persist per User Counter" enabled)
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
