using arolariu.Backend.Core.Auth.Models;

using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace arolariu.Backend.Core.Auth.Brokers;

public class AuthDbContext(DbContextOptions options) : IdentityDbContext<AuthenticatedUser>(options)
{
}
