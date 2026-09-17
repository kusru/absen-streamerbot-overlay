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

        CPH.TryGetArg("watchStreak", out int streakCount);

        // Diisi oleh sub-action "Get User Info For Target" sebelumnya
        CPH.TryGetArg("targetUserProfileImageUrl", out string userProfile);

        var payload = new
        {
            type = "watchstreak",
            userName = userDisplayName,
            userLogin = userLogin,
            streakCount = streakCount,
            profileURL = userProfile
        };

        CPH.WebsocketBroadcastJson(JsonConvert.SerializeObject(payload));
        return true;
    }
}