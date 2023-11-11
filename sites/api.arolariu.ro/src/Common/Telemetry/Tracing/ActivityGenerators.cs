using System.Diagnostics;

namespace arolariu.Backend.Common.Telemetry.Tracing;

public static class ActivityGenerators
{
    public static readonly ActivitySource CommonPackageTracing = new("arolariu.Backend.Common");
    public static readonly ActivitySource CorePackageTracing = new("arolariu.Backend.Core");
    public static readonly ActivitySource AuthPackageTracing = new("arolariu.Backend.Auth");
    public static readonly ActivitySource InvoicePackageTracing = new("arolariu.Backend.Domain.Invoices");
}
