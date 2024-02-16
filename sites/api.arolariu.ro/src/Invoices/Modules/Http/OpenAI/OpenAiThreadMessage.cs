using System.Collections.Generic;

namespace arolariu.Backend.Domain.Invoices.Modules.Http.OpenAI;

/// <summary>
/// The OpenAI thread message structure.
/// </summary>
/// <param name="type"></param>
/// <param name="text"></param>
public record struct OpenAiThreadMessage(string type, IReadOnlyDictionary<string, object> text);