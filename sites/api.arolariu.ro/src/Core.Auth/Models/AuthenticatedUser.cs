using Microsoft.AspNetCore.Identity;

using System;

namespace arolariu.Backend.Core.Auth.Models;

/// <summary>
/// To complete.
/// </summary>
public class AuthenticatedUser: IdentityUser
{
    private DateTimeOffset CreatedAt { get; set; }
}
