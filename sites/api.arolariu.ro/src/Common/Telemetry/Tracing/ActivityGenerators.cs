using System.Diagnostics;

namespace arolariu.Backend.Common.Telemetry.Tracing;

// TODO: This class should be automatically generated from the dlls.

/// <summary>
/// The activity generators for the application.
/// </summary>
public static class ActivityGenerators
{
    /// <summary>
    /// The activity sources for the common package.
    /// </summary>
    public static readonly ActivitySource CommonPackageTracing = new("arolariu.Backend.Common");

    /// <summary>
    /// The activity sources for the core package.
    /// </summary>
    public static readonly ActivitySource CorePackageTracing = new("arolariu.Backend.Core");

    /// <summary>
    /// The activity sources for the auth package.
    /// </summary>
    public static readonly ActivitySource AuthPackageTracing = new("arolariu.Backend.Auth");

    /// <summary>
    /// The activity sources for the invoices package.
    /// </summary>
    public static readonly ActivitySource InvoicePackageTracing = new("arolariu.Backend.Domain.Invoices");
}
