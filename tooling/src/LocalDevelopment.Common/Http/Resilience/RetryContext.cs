namespace LocalDevelopment.Common.Http.Resilience;

/// <summary>Describes a failed operation attempt that will be retried.</summary>
/// <param name="Exception">The original operation exception, without wrapping or replacement.</param>
/// <param name="Attempt">The one-based failed attempt number; one precedes the first retry.</param>
/// <param name="MaxAttempts">The configured total attempt budget, including the initial attempt.</param>
/// <param name="Delay">The configured delay to apply after the retry callback completes.</param>
public sealed record RetryContext(Exception Exception, int Attempt, int MaxAttempts, TimeSpan Delay);
