namespace arolariu.Backend.Common;

using System;

/// <summary>
/// Provides well-known GUID constants used throughout the application for sentinel values and special identifiers.
/// </summary>
/// <remarks>
/// <para>
/// <b>Purpose:</b> These constants define system-wide sentinel GUIDs that carry semantic meaning across all bounded contexts.
/// Using constants instead of inline values ensures consistency, prevents typos, and enables refactoring safety.
/// </para>
/// <para>
/// <b>EMPTY_GUID:</b> Represents the minimum GUID value (all zeros). Used to indicate an uninitialized or guest/anonymous user state.
/// </para>
/// <para>
/// <b>LAST_GUID:</b> Represents the maximum GUID value (all nines). Used as a sentinel to indicate public/unrestricted access.
/// When present in the <c>SharedWith</c> collection of an invoice, it means the invoice is publicly accessible.
/// </para>
/// </remarks>
public static class GuidConstants
{
  /// <summary>
  /// The minimum GUID value (all zeros): <c>00000000-0000-0000-0000-000000000000</c>.
  /// </summary>
  /// <remarks>
  /// <para>Used to represent:</para>
  /// <list type="bullet">
  /// <item><description>Uninitialized entity identifiers</description></item>
  /// <item><description>Guest or anonymous user state</description></item>
  /// <item><description>Absence of a reference (null alternative)</description></item>
  /// </list>
  /// </remarks>
  public static readonly Guid EmptyGuid = Guid.Empty;

  /// <summary>
  /// The maximum GUID value (all nines): <c>99999999-9999-9999-9999-999999999999</c>.
  /// </summary>
  /// <remarks>
  /// <para>Used to represent:</para>
  /// <list type="bullet">
  /// <item><description>Public access sentinel in sharing contexts</description></item>
  /// <item><description>Unrestricted visibility marker</description></item>
  /// </list>
  /// <para>
  /// <b>Example:</b> When an invoice's <c>SharedWith</c> collection contains this GUID,
  /// the invoice is considered publicly accessible to all users, including guests.
  /// </para>
  /// </remarks>
  public static readonly Guid LastGuid = Guid.Parse("99999999-9999-9999-9999-999999999999");
}
