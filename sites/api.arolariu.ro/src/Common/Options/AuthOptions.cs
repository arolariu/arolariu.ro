namespace arolariu.Backend.Common.Options;

/// <summary>
/// Options for the authentication.
/// </summary>
public class AuthOptions
{
    /// <summary>
    /// The JWT structure issuer.
    /// </summary>
    public string Issuer { get; set; } = string.Empty;

    /// <summary>
    /// The JWT structure audience.
    /// </summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>
    /// The secret used to sign the JWT structure.
    /// </summary>
    public string Secret { get; set; } = string.Empty;
}