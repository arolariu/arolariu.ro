namespace arolariu.Backend.Domain.Invoices.DDD.Analysis.Contracts;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;

/// <summary>
/// Represents the selected merchant analysis capability set for a single workflow invocation.
/// </summary>
public sealed record MerchantAnalysisOptions
{
  /// <summary>
  /// Initializes a new instance of the <see cref="MerchantAnalysisOptions"/> record.
  /// </summary>
  /// <param name="profile">The composition profile describing how these merchant capability selections were produced.</param>
  /// <param name="merchantClassification">Whether merchant classification should run.</param>
  /// <param name="descriptionGeneration">Whether description generation should run.</param>
  /// <exception cref="ArgumentException">Thrown when the profile conflicts with the supplied capability flags.</exception>
  /// <exception cref="ArgumentOutOfRangeException">Thrown when <paramref name="profile"/> is not a defined analysis profile.</exception>
  public MerchantAnalysisOptions(
    AnalysisProfile profile,
    bool merchantClassification,
    bool descriptionGeneration)
  {
    if (!Enum.IsDefined(profile))
    {
      throw new ArgumentOutOfRangeException(nameof(profile), profile, "Profile must be a defined analysis profile.");
    }

    if (profile == AnalysisProfile.Comprehensive
        && (!merchantClassification || !descriptionGeneration))
    {
      throw new ArgumentException("Comprehensive merchant analysis options must enable every merchant capability.", nameof(profile));
    }

    Profile = profile;
    MerchantClassification = merchantClassification;
    DescriptionGeneration = descriptionGeneration;
  }

  /// <summary>
  /// Gets the composition profile describing how this capability set was produced.
  /// </summary>
  public AnalysisProfile Profile { get; }

  /// <summary>
  /// Gets a value indicating whether merchant classification should run.
  /// </summary>
  public bool MerchantClassification { get; }

  /// <summary>
  /// Gets a value indicating whether description generation should run.
  /// </summary>
  public bool DescriptionGeneration { get; }

  /// <summary>
  /// Creates the published comprehensive merchant analysis preset.
  /// </summary>
  /// <returns>The comprehensive merchant analysis option set.</returns>
  public static MerchantAnalysisOptions Comprehensive() =>
    new(
      AnalysisProfile.Comprehensive,
      merchantClassification: true,
      descriptionGeneration: true);
}
