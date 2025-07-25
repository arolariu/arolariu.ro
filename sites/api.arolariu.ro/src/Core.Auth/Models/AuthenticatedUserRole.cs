namespace arolariu.Backend.Core.Auth.Models;

using System;

using Microsoft.AspNetCore.Identity;

/// <summary>
/// Represents a user role in the authentication system for role-based access control.
/// This class extends ASP.NET Core Identity's IdentityRole to define user permissions and access levels.
/// </summary>
/// <remarks>
/// This model provides role-based authorization capabilities:
/// - Defines permission groups for users (e.g., Admin, User, Moderator)
/// - Integrates with ASP.NET Core Identity role management
/// - Uses Guid-based primary keys for enhanced security
/// - Supports hierarchical and policy-based authorization scenarios
/// </remarks>
/// <example>
/// <code>
/// // Creating system roles
/// var adminRole = new AuthenticatedUserRole
/// {
///     Id = Guid.NewGuid(),
///     Name = "Administrator",
///     NormalizedName = "ADMINISTRATOR"
/// };
///
/// var userRole = new AuthenticatedUserRole
/// {
///     Id = Guid.NewGuid(),
///     Name = "User",
///     NormalizedName = "USER"
/// };
/// </code>
/// </example>
public class AuthenticatedUserRole : IdentityRole<Guid>
{
}
