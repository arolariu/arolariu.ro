namespace arolariu.Backend.Common.Configuration;

/// <summary>
/// Defines the named rate limiting policy constants used across the API.
/// These policy names are used to reference rate limiting policies when configuring endpoints.
/// </summary>
/// <remarks>
/// <para>
/// Rate limiting policies control request throughput based on user identity and operation type.
/// The actual policy configurations are registered in the Core project.
/// </para>
/// <para>
/// <strong>Policy Categories:</strong>
/// <list type="bullet">
///   <item><description><see cref="StandardReads"/>: High-throughput read operations (300 req/min)</description></item>
///   <item><description><see cref="StandardWrites"/>: Moderate write operations (60 req/min)</description></item>
///   <item><description><see cref="AnalysisOperations"/>: Resource-intensive AI/ML operations (10 req/hour)</description></item>
///   <item><description><see cref="HealthCheck"/>: Unlimited for monitoring systems</description></item>
/// </list>
/// </para>
/// </remarks>
public static class RateLimitPolicies
{
	/// <summary>
	/// Policy name for standard read operations (GET requests).
	/// Allows 300 requests per minute per user/IP.
	/// </summary>
	public const string StandardReads = "StandardReads";

	/// <summary>
	/// Policy name for standard write operations (POST, PUT, PATCH, DELETE requests).
	/// Allows 60 requests per minute per user/IP.
	/// </summary>
	public const string StandardWrites = "StandardWrites";

	/// <summary>
	/// Policy name for resource-intensive analysis operations (AI/ML processing).
	/// Allows 10 requests per hour per user/IP.
	/// </summary>
	public const string AnalysisOperations = "AnalysisOperations";

	/// <summary>
	/// Policy name for health check endpoints (unlimited for monitoring systems).
	/// </summary>
	public const string HealthCheck = "HealthCheck";
}
