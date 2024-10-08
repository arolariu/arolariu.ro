﻿namespace arolariu.Backend.Common.Options;

/// <summary>
/// Options for the authentication.
/// </summary>
public sealed class AuthOptions
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

	/// <summary>
	/// The SMTP Service Principal.
	/// </summary>
	public string SmtpUserId { get; set; } = string.Empty;

	/// <summary>
	/// The SMTP Service Principal secret.
	/// </summary>
	public string SmtpUserPass { get; set; } = string.Empty;
}
