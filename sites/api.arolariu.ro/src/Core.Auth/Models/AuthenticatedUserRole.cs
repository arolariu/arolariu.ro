namespace arolariu.Backend.Core.Auth.Models;

using System;

using Microsoft.AspNetCore.Identity;

/// <summary>
/// The role of an authenticated user.
/// </summary>
public class AuthenticatedUserRole : IdentityRole<Guid>
{
}
