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

