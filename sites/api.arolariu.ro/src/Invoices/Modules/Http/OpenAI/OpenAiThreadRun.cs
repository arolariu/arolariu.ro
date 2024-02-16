using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;

namespace arolariu.Backend.Domain.Invoices.Modules.Http.OpenAI;

/// <summary>
/// The OpenAI thread run structure.
/// </summary>
/// <param name="id"></param>
/// <param name="created_at"></param>
/// <param name="assistant_id"></param>
/// <param name="thread_id"></param>
/// <param name="status"></param>
/// <param name="started_at"></param>
/// <param name="expires_at"></param>
/// <param name="cancelled_at"></param>
/// <param name="failed_at"></param>
/// <param name="completed_at"></param>
/// <param name="last_error"></param>
/// <param name="model"></param>
/// <param name="instructions"></param>
/// <param name="file_ids"></param>
/// <param name="metadata"></param>
#pragma warning disable CA1707 // Identifiers should not contain underscores
#pragma warning disable CA2227 // Collection properties should be read only
public record struct OpenAiThreadRun(
    string id,
    DateTimeOffset created_at,
    string assistant_id,
    string thread_id,
    OpenAiThreadStatus status,
    DateTimeOffset started_at,
    DateTimeOffset expires_at,
    DateTimeOffset cancelled_at,
    DateTimeOffset failed_at,
    DateTimeOffset completed_at,
    string last_error,
    string model,
    string instructions,
    IEnumerable<string> file_ids,
    JsonObject metadata);
#pragma warning restore CA2227 // Collection properties should be read only
#pragma warning restore CA1707 // Identifiers should not contain underscores
