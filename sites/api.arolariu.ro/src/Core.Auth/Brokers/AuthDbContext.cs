using arolariu.Backend.Core.Auth.Models;

using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace arolariu.Backend.Core.Auth.Brokers;

/// <summary>
/// To complete.
/// </summary>
/// <param name="options"></param>
public class AuthDbContext(DbContextOptions options) : IdentityDbContext<AuthenticatedUser>(options)
{
}
