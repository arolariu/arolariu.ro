﻿namespace arolariu.Backend.Core.Auth.Models;

using System;

using Microsoft.AspNetCore.Identity;

/// <summary>
/// To complete.
/// </summary>
public class AuthenticatedUser : IdentityUser<Guid>
{
	/// <summary>
	/// The name of the user.
	/// </summary>
	[PersonalData]
	public string? Name { get; set; }
}
