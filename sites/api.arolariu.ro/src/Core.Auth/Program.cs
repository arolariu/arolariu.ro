using arolariu.Backend.Core.Auth.Brokers;
using arolariu.Backend.Core.Auth.Models;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace arolariu.Backend.Core.Auth;

public static class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.Services.AddAuthentication().AddBearerToken(IdentityConstants.BearerScheme);
        builder.Services.AddAuthorizationBuilder();

        builder.Services.AddDbContext<AuthDbContext>(config =>
        {
            config.UseSqlite("Data Source=auth.db");
        });

        builder.Services.AddIdentityCore<AuthenticatedUser>()
            .AddEntityFrameworkStores<AuthDbContext>()
            .AddApiEndpoints();

        var app = builder.Build();
        app.MapGroup("/auth").MapIdentityApi<AuthenticatedUser>();
        //app.MapGet("/", (ClaimsPrincipal user) => $"Hello {user.Identity!.Name}")
        app.Run();
    }
}