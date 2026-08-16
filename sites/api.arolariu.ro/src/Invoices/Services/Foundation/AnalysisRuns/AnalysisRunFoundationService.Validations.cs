namespace arolariu.Backend.Domain.Invoices.Services.Foundation.AnalysisRuns;

using System;

using arolariu.Backend.Domain.Invoices.DDD.Analysis.Aggregates;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Enums;
using arolariu.Backend.Domain.Invoices.DDD.Analysis.Exceptions.Inner;

public partial class AnalysisRunFoundationService
{
  private static void ValidateRunIsSet(AnalysisRun run) =>
    ArgumentNullException.ThrowIfNull(run);

  private static void ValidateRunIdIsSet(Guid runId)
  {
    if (runId == Guid.Empty)
    {
      throw new ArgumentException("Run identifier must be set.", nameof(runId));
    }
  }

  private static void ValidateLeaseOwnerIsSet(string leaseOwner) =>
    ArgumentException.ThrowIfNullOrWhiteSpace(leaseOwner);

  private static void ValidateLeaseDurationIsPositive(TimeSpan leaseDuration)
  {
    if (leaseDuration <= TimeSpan.Zero)
    {
      throw new ArgumentOutOfRangeException(nameof(leaseDuration), leaseDuration, "Lease duration must be positive.");
    }
  }

  private static void ValidateFailureCodeIsSet(string failureCode) =>
    ArgumentException.ThrowIfNullOrWhiteSpace(failureCode);

  private static void ValidateCompletedCapabilitiesAreSet(System.Collections.Generic.IReadOnlyCollection<AnalysisCapability> completedCapabilities) =>
    ArgumentNullException.ThrowIfNull(completedCapabilities);

  /// <summary>
  /// Ensures the run was found and is currently held by the expected lease owner, throwing the appropriate
  /// dependency-validation exception otherwise.
  /// </summary>
  private static AnalysisRun ValidateRunExistsAndLeaseOwnerMatches(AnalysisRun? run, Guid runId, string expectedLeaseOwner)
  {
    if (run is null)
    {
      throw new AnalysisRunNotFoundException(runId);
    }

    if (!string.Equals(run.LeaseOwner, expectedLeaseOwner, StringComparison.Ordinal))
    {
      throw new AnalysisRunLeaseConflictException(runId, expectedLeaseOwner, run.LeaseOwner);
    }

    return run;
  }
}
