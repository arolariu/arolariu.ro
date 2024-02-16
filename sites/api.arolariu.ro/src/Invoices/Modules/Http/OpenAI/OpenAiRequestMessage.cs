using System.Collections.Generic;

namespace arolariu.Backend.Domain.Invoices.Modules.Http.OpenAI;

/// <summary>
/// The OpenAI thread conversation message structure.
/// </summary>
#pragma warning disable IDE1006 // Naming Styles
#pragma warning disable CA1707 // Identifiers should not contain underscores
public record struct OpenAiRequestMessage(OpenAiThreadMessageRole role, string content, IEnumerable<string> file_ids);
#pragma warning restore CA1707 // Identifiers should not contain underscores
#pragma warning restore IDE1006 // Naming Styles

