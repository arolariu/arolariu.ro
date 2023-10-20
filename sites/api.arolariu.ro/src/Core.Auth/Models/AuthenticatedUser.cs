using Microsoft.AspNetCore.Identity;

using System;

namespace arolariu.Backend.Core.Auth.Models;

/// <summary>
/// To complete.
/// </summary>
public class AuthenticatedUser: IdentityUser
{
#pragma warning disable S1144 // Unused private types or members should be removed
    private DateTimeOffset CreatedAt { get; set; }
#pragma warning restore S1144 // Unused private types or members should be removed
}
