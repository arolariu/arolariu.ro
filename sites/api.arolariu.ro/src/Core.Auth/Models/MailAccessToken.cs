namespace arolariu.Backend.Core.Auth.Models;

/// <summary>
/// The model for the mail access token.
/// </summary>
/// <param name="access_token"></param>
/// <param name="token_type"></param>
/// <param name="expires_in"></param>
#pragma warning disable IDE1006 // Naming Styles
internal record struct MailAccessToken(string access_token, string token_type, int expires_in);
#pragma warning restore IDE1006 // Naming Styles
