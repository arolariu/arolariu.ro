namespace arolariu.Backend.Core.Auth.Brokers;

using System;

using arolariu.Backend.Core.Auth.Models;

using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

/// <summary>
/// Provides the Entity Framework database context for authentication and authorization data.
/// This context manages user accounts, roles, and related security information using ASP.NET Core Identity.
/// </summary>
/// <remarks>
/// This database context extends IdentityDbContext to provide:
/// - User account management with extended profile fields
/// - Role-based access control with custom roles
/// - ASP.NET Core Identity integration for authentication
/// - Guid-based primary keys for enhanced security
/// - Support for Entity Framework migrations and schema management
/// </remarks>
/// <example>
/// <code>
/// // Usage in dependency injection
/// services.AddDbContext&lt;AuthDbContext&gt;(options =>
///     options.UseSqlServer(connectionString));
///
/// // Usage in services
/// public class UserService
/// {
///     private readonly AuthDbContext _context;
///
///     public UserService(AuthDbContext context)
///     {
///         _context = context;
///     }
/// }
/// </code>
/// </example>
public class AuthDbContext : IdentityDbContext<AuthenticatedUser, AuthenticatedUserRole, Guid>
{
  /// <summary>
  /// Initializes a new instance of the <see cref="AuthDbContext"/> class with the specified options.
  /// This constructor is used by dependency injection to provide database configuration.
  /// </summary>
  /// <param name="options">
  /// The <see cref="DbContextOptions{AuthDbContext}"/> containing database connection and configuration settings.
  /// These options typically include connection string, database provider, and performance settings.
  /// </param>
  /// <remarks>
  /// The options parameter configures:
  /// - Database connection string and provider (SQL Server, PostgreSQL, etc.)
  /// - Connection retry policies for resilience
  /// - Performance settings like lazy loading and change tracking
  /// - Migration and schema management options
  /// </remarks>
  public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options) { }

  /// <summary>
  /// Initializes a new instance of the <see cref="AuthDbContext"/> class without options.
  /// This parameterless constructor is required for Entity Framework migrations and design-time operations.
  /// </summary>
  /// <remarks>
  /// This constructor is used by:
  /// - Entity Framework migration tools during database schema generation
  /// - Design-time operations like scaffolding and reverse engineering
  /// - Testing scenarios where options are configured separately
  /// - Third-party tools that require parameterless constructors
  /// </remarks>
  public AuthDbContext() { }
}
