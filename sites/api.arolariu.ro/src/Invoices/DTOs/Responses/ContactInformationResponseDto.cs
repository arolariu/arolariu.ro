namespace arolariu.Backend.Domain.Invoices.DTOs.Responses;

using System;
using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

using arolariu.Backend.Common.DDD.ValueObjects;

/// <summary>
/// Represents merchant contact information in the public response contract.
/// </summary>
/// <param name="FullName">The merchant's full legal or display name.</param>
/// <param name="Address">The merchant's postal address.</param>
/// <param name="PhoneNumber">The merchant's contact telephone number.</param>
/// <param name="EmailAddress">The merchant's contact email address.</param>
/// <param name="Website">The merchant's public website address.</param>
[Serializable]
[ExcludeFromCodeCoverage]
public readonly record struct ContactInformationResponseDto(
  [property: JsonPropertyName("fullName")] string FullName,
  [property: JsonPropertyName("address")] string Address,
  [property: JsonPropertyName("phoneNumber")] string PhoneNumber,
  [property: JsonPropertyName("emailAddress")] string EmailAddress,
  [property: JsonPropertyName("website")] string Website)
{
  /// <summary>
  /// Projects merchant contact information into its public transport representation.
  /// </summary>
  /// <param name="contactInformation">The contact information to project.</param>
  /// <returns>An immutable contact-information response.</returns>
  /// <exception cref="ArgumentNullException">Thrown when <paramref name="contactInformation"/> is null.</exception>
  public static ContactInformationResponseDto FromContactInformation(ContactInformation contactInformation)
  {
    ArgumentNullException.ThrowIfNull(contactInformation);
    return new(
      contactInformation.FullName,
      contactInformation.Address,
      contactInformation.PhoneNumber,
      contactInformation.EmailAddress,
      contactInformation.Website);
  }
}
