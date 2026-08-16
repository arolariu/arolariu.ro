namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Results;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

/// <summary>
/// Represents the transient merchant candidate selected from receipt extraction.
/// </summary>
public sealed record MerchantCandidate
{
  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantCandidate"/> record.
  /// </summary>
  /// <param name="name">The extracted merchant name.</param>
  /// <param name="address">The extracted merchant address.</param>
  /// <param name="phoneNumber">The extracted merchant phone number.</param>
  /// <param name="nameConfidence">The confidence for <paramref name="name"/>.</param>
  /// <param name="addressConfidence">The confidence for <paramref name="address"/>.</param>
  /// <param name="phoneNumberConfidence">The confidence for <paramref name="phoneNumber"/>.</param>
  public MerchantCandidate(
    string name,
    string address,
    string phoneNumber,
    double nameConfidence,
    double addressConfidence,
    double phoneNumberConfidence)
  {
    Name = AnalysisContractGuards.NormalizeOptionalText(name) ?? string.Empty;
    Address = AnalysisContractGuards.NormalizeOptionalText(address) ?? string.Empty;
    PhoneNumber = AnalysisContractGuards.NormalizeOptionalText(phoneNumber) ?? string.Empty;
    NameConfidence = AnalysisContractGuards.RequireConfidence(nameConfidence, nameof(nameConfidence));
    AddressConfidence = AnalysisContractGuards.RequireConfidence(addressConfidence, nameof(addressConfidence));
    PhoneNumberConfidence = AnalysisContractGuards.RequireConfidence(phoneNumberConfidence, nameof(phoneNumberConfidence));
  }

  /// <summary>
  /// Gets the extracted merchant name.
  /// </summary>
  public string Name { get; }

  /// <summary>
  /// Gets the extracted merchant address.
  /// </summary>
  public string Address { get; }

  /// <summary>
  /// Gets the extracted merchant phone number.
  /// </summary>
  public string PhoneNumber { get; }

  /// <summary>
  /// Gets the confidence for <see cref="Name"/>.
  /// </summary>
  public double NameConfidence { get; }

  /// <summary>
  /// Gets the confidence for <see cref="Address"/>.
  /// </summary>
  public double AddressConfidence { get; }

  /// <summary>
  /// Gets the confidence for <see cref="PhoneNumber"/>.
  /// </summary>
  public double PhoneNumberConfidence { get; }
}
