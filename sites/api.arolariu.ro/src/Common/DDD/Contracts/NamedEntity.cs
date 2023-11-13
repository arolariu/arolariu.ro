using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

namespace arolariu.Backend.Common.DDD.Contracts;

/// <summary>
/// Named entity.
/// The first three properties are:
/// <list type="number">
/// <item>Id of type <typeparamref name="T"/></item>
/// <item>Name of type <see cref="System.String"/></item>
/// <item>Description of type <see cref="System.String"/></item>
/// </list>
/// </summary>
/// <typeparam name="T"></typeparam>
[ExcludeFromCodeCoverage] // Contract class is not tested.
public abstract class NamedEntity<T> : BaseEntity<T>
{
    /// <summary>
    /// The name of the entity.
    /// </summary>
    [JsonPropertyOrder(1)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The description of the entity.
    /// </summary>
    [JsonPropertyOrder(2)]
    public string Description { get; set; } = string.Empty;
}
