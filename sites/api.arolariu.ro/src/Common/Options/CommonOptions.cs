namespace arolariu.Backend.Common.Options;

public class CommonOptions
{
    #region General configuration
    /// <summary>
    /// The name of the application.
    /// </summary>
    public string ApplicationName { get; set; } = string.Empty;

    /// <summary>
    /// The version of the application.
    /// </summary>
    public string ApplicationVersion { get; set; } = string.Empty;

    /// <summary>
    /// The description of the application.
    /// </summary>
    public string ApplicationDescription { get; set; } = string.Empty;

    /// <summary>
    /// The author of the application.
    /// </summary>
    public string ApplicationAuthor { get; set; } = string.Empty;
    /// <summary>
    /// The terms and conditions of the application.
    /// </summary>
    public string TermsAndConditions { get; set; } = string.Empty;
    #endregion

    #region Open Telemetry configuration
    /// <summary>
    /// The instrumentation key for Application Insights (OTel exporter).
    /// </summary>
    public string ApplicationInsightsEndpoint { get; set; } = string.Empty;
    #endregion
}