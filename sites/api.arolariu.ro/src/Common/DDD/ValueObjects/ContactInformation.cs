namespace arolariu.Backend.Common.DDD.ValueObjects;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Contact information value object.
/// </summary>
[ExcludeFromCodeCoverage]
public sealed record ContactInformation
{
  /// <summary>
  /// Get or set the full name.
  /// </summary>
  public string FullName { get; set; } = string.Empty;

  /// <summary>
  /// Gets or sets the address associated with the object.
  /// </summary>
  public string Address { get; set; } = string.Empty;

  /// <summary>
  /// Gets or sets the phone number.
  /// </summary>
  public string PhoneNumber { get; set; } = string.Empty;

  /// <summary>
  /// Gets or sets the email address.
  /// </summary>
  public string EmailAddress { get; set; } = string.Empty;

  /// <summary>
  /// Gets or sets the website URL.
  /// </summary>
  public string Website { get; set; } = string.Empty;
}
