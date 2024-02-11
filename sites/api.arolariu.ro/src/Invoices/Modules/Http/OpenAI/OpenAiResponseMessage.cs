using System;
using System.Collections.Generic;
using System.Text.Json.Nodes;

namespace arolariu.Backend.Domain.Invoices.Modules.Http.OpenAI;

/// <summary>
/// The OpenAI thread message base structure.
/// </summary>
/// <param name="id"></param>
/// <param name="created_at"></param>
/// <param name="thread_id"></param>
/// <param name="role"></param>
/// <param name="content"></param>
/// <param name="file_ids"></param>
/// <param name="assistant_id"></param>
/// <param name="run_id"></param>
/// <param name="metadata"></param>
#pragma warning disable CA1707 // Identifiers should not contain underscores
#pragma warning disable CA2227 // Collection properties should be read only
public record struct OpenAiResponseMessage(
    string id,
    DateTimeOffset created_at,
    string thread_id,
    OpenAiThreadMessageRole role,
    IEnumerable<OpenAiThreadMessage> content,
    IEnumerable<string> file_ids,
    string assistant_id,
    string run_id,
    JsonObject metadata);
#pragma warning restore CA2227 // Collection properties should be read only
#pragma warning restore CA1707 // Identifiers should not contain underscores
