namespace arolariu.Backend.Common.DDD.ValueObjects;

/// <summary>
/// Contact information value object.
/// </summary>
public readonly record struct ContactInformation
  (string FullName, string Address, string PhoneNumber, string EmailAddress, string Website)
{
}
