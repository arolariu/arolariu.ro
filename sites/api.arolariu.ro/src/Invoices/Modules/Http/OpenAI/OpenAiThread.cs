using System;
using System.Text.Json.Nodes;

namespace arolariu.Backend.Domain.Invoices.Modules.Http.OpenAI;

/// <summary>
/// The OpenAI thread structure.
/// </summary>
/// <param name="id"></param>
/// <param name="created_at"></param>
/// <param name="metadata"></param>
#pragma warning disable IDE1006 // Naming Styles
#pragma warning disable CA1707 // Identifiers should not contain underscores
#pragma warning disable CA2227 // Collection properties should be read only
public record struct OpenAiThread(string id, DateTimeOffset created_at, JsonObject metadata);
#pragma warning restore CA2227 // Collection properties should be read only
#pragma warning restore CA1707 // Identifiers should not contain underscores
#pragma warning restore IDE1006 // Naming Styles