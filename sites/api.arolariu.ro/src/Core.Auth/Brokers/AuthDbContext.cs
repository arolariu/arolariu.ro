namespace arolariu.Backend.Core.Auth.Brokers;
using arolariu.Backend.Core.Auth.Models;

using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// To complete.
/// </summary>
/// <param name="options"></param>
public class AuthDbContext(DbContextOptions options) : IdentityDbContext<AuthenticatedUser>(options)
{
}
