namespace arolariu.Backend.Core.Auth.Models;

using System;

using Microsoft.AspNetCore.Identity;

/// <summary>
/// Represents an authenticated user in the system with extended profile information.
/// This class extends ASP.NET Core Identity's IdentityUser with additional personal data fields.
/// </summary>
/// <remarks>
/// This model integrates with ASP.NET Core Identity to provide:
/// - Standard authentication fields (username, email, password hash)
/// - Extended user profile information (name, date of birth)
/// - GDPR compliance through PersonalData attributes
/// - Guid-based primary keys for enhanced security and scalability
/// </remarks>
/// <example>
/// <code>
/// // Creating a new authenticated user
/// var user = new AuthenticatedUser
/// {
///     UserName = "john.doe@example.com",
///     Email = "john.doe@example.com",
///     Name = "John Doe",
///     DateOfBirth = new DateOnly(1990, 5, 15),
///     EmailConfirmed = true
/// };
/// </code>
/// </example>
public class AuthenticatedUser : IdentityUser<Guid>
{
	/// <summary>
	/// Gets or sets the display name of the user.
	/// This field contains the user's preferred name for display purposes.
	/// </summary>
	/// <value>
	/// A string representing the user's display name, or null if not provided.
	/// This value may differ from the username and is used for personalization.
	/// </value>
	/// <remarks>
	/// This property is marked as PersonalData for GDPR compliance:
	/// - Included in data export requests
	/// - Removed during account deletion
	/// - Subject to data protection regulations
	/// - Used for UI personalization and user identification
	/// </remarks>
	[PersonalData]
	public string? Name { get; set; }

	/// <summary>
	/// Gets or sets the user's date of birth.
	/// This field is used for age verification and demographic analysis.
	/// </summary>
	/// <value>
	/// A DateOnly representing the user's birth date.
	/// Used for age-related features and compliance requirements.
	/// </value>
	/// <remarks>
	/// This property is marked as PersonalData for GDPR compliance:
	/// - Sensitive personal information requiring protection
	/// - Used for age verification and content filtering
	/// - May be required for certain services or legal compliance
	/// - Subject to data retention and deletion policies
	/// </remarks>
	[PersonalData]
	public DateOnly DateOfBirth { get; set; }
}
