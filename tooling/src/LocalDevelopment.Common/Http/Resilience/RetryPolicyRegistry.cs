namespace LocalDevelopment.Common.Http.Resilience;

using System.Collections.Frozen;

/// <summary>Stores an immutable snapshot of retry policies by ordinal name.</summary>
/// <remarks>Changes to the source collection do not affect registered policies. Lookups are case-sensitive.</remarks>
public sealed class RetryPolicyRegistry
{
  private readonly FrozenDictionary<string, RetryPolicy> policies;

  /// <summary>Creates a snapshot of validated policies with unique names.</summary>
  /// <param name="policies">The policies to register; an empty sequence is permitted.</param>
  /// <exception cref="ArgumentNullException">The sequence, an entry, a policy name, or a policy delegate is null.</exception>
  /// <exception cref="ArgumentException">A policy name is blank or duplicates another name using ordinal comparison.</exception>
  /// <exception cref="ArgumentOutOfRangeException">A policy's attempt budget is less than one.</exception>
  public RetryPolicyRegistry(IEnumerable<RetryPolicy> policies)
  {
    ArgumentNullException.ThrowIfNull(policies);

    var snapshot = new Dictionary<string, RetryPolicy>(StringComparer.Ordinal);
    foreach (RetryPolicy policy in policies)
    {
      ArgumentNullException.ThrowIfNull(policy);
      policy.Validate();
      snapshot.Add(policy.Name, policy);
    }

    this.policies = snapshot.ToFrozenDictionary(StringComparer.Ordinal);
  }

  /// <summary>Gets the policy registered under the exact supplied name.</summary>
  /// <param name="name">The case-sensitive policy name.</param>
  /// <value>The original immutable policy configuration.</value>
  /// <exception cref="ArgumentNullException">The name is null.</exception>
  /// <exception cref="KeyNotFoundException">No policy has the supplied name.</exception>
  public RetryPolicy this[string name] => policies[name];
}
