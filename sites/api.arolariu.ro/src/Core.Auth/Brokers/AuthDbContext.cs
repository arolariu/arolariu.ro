namespace arolariu.Backend.Core.Auth.Brokers;

using System;

using arolariu.Backend.Core.Auth.Models;

using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// The main database context for the authentication module.
/// </summary>
public class AuthDbContext : IdentityDbContext<AuthenticatedUser, AuthenticatedUserRole, Guid>
{
	/// <summary>
	/// The constructor for the <see cref="AuthDbContext"/>.
	/// </summary>
	/// <param name="options"></param>
	public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }

	/// <summary>
	/// Parameterless constructor for the <see cref="AuthDbContext"/>.
	/// This is required for  migrations.
	/// </summary>
	public AuthDbContext() { }
}
