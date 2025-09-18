namespace arolariu.Backend.Common.DDD.Contracts;

using System.Diagnostics.CodeAnalysis;
using System.Text.Json.Serialization;

/// <summary>
/// Provides an abstract base class for domain entities that require human-readable identification.
/// This class extends <see cref="BaseEntity{T}"/> by adding name and description properties
/// for entities that need to be presented or referenced by name in user interfaces and business operations.
/// </summary>
/// <typeparam name="T">
/// The type of the entity's primary key. Common types include <see cref="System.Guid"/>,
/// <see cref="int"/>, and <see cref="string"/>.
/// </typeparam>
/// <remarks>
/// <para>
/// NamedEntity is designed for domain entities that require human-readable identification beyond
/// their technical identifiers. It provides a standardized structure for entities that are
/// commonly referenced by name in business operations, user interfaces, and reporting.
/// </para>
/// <para>
/// The class establishes a consistent property order for JSON serialization:
/// 1. <c>id</c> - The unique technical identifier (inherited from <see cref="BaseEntity{T}"/>)
/// 2. <c>Name</c> - The human-readable name for display and reference purposes
/// 3. <c>Description</c> - Optional detailed description for additional context
/// 4. Audit properties - Creation, modification, and metadata fields (inherited)
/// </para>
/// <para>
/// <strong>Common Use Cases:</strong>
/// - Catalog entities (products, categories, brands)
/// - Configuration entities (settings, templates, rules)
/// - Reference data (countries, currencies, status codes)
/// - User-manageable entities (projects, organizations, groups)
/// </para>
/// <para>
/// <strong>Design Considerations:</strong>
/// - Name property is mutable to support business requirements for renaming
/// - Description is optional and can be empty for simple entities
/// - Inherits full audit trail capabilities from BaseEntity
/// - Supports soft deletion and importance marking
/// </para>
/// </remarks>
/// <example>
/// <code>
/// // Example implementation for a product category
/// public class Category : NamedEntity&lt;Guid&gt;
/// {
///     public override required Guid id { get; init; } = Guid.NewGuid();
///
///     // Name and Description are inherited and can be used directly
///     public Category(string name, string description = "")
///     {
///         Name = name;
///         Description = description;
///     }
/// }
///
/// // Usage example
/// var category = new Category("Electronics", "Consumer electronics and gadgets")
/// {
///     CreatedBy = userId,
///     IsImportant = true
/// };
///
/// // The entity provides both technical and business identification
/// Console.WriteLine($"Category ID: {category.id}");
/// Console.WriteLine($"Category Name: {category.Name}");
/// Console.WriteLine($"Description: {category.Description}");
/// </code>
/// </example>
[ExcludeFromCodeCoverage] // Contract class is not tested as it provides only structural functionality.
public abstract class NamedEntity<T> : BaseEntity<T>
{
  /// <summary>
  /// Gets or sets the human-readable name of the entity.
  /// This property provides a business-friendly identifier for display, searching, and reference purposes.
  /// </summary>
  /// <value>
  /// A string representing the entity's name. Defaults to an empty string for new entities.
  /// The name should be meaningful to business users and suitable for display in user interfaces.
  /// </value>
  /// <remarks>
  /// <para>
  /// The Name property serves multiple purposes in the domain model:
  /// - Primary display text in user interfaces and reports
  /// - Search and filtering criteria for entity lookup
  /// - Business reference in logs, audit trails, and documentation
  /// - Human-readable identifier in API responses and exports
  /// </para>
  /// <para>
  /// <strong>Naming Guidelines:</strong>
  /// - Should be concise but descriptive enough for clear identification
  /// - Consider internationalization requirements for multi-language support
  /// - Avoid technical jargon unless the audience consists of technical users
  /// - Ensure uniqueness where business rules require it (enforced at the business logic level)
  /// </para>
  /// <para>
  /// <strong>Implementation Notes:</strong>
  /// - Ordered as the second property in JSON serialization (after id)
  /// - Mutable to support business scenarios requiring entity renaming
  /// - No built-in validation - validation should be implemented in domain services
  /// - Consider implementing change tracking if name history is important
  /// </para>
  /// </remarks>
  /// <example>
  /// <code>
  /// // Setting a descriptive name
  /// product.Name = "Wireless Bluetooth Headphones";
  ///
  /// // Names should be business-friendly
  /// category.Name = "Home and Garden"; // Good
  /// category.Name = "CAT_HG_001";    // Avoid technical codes in names
  /// </code>
  /// </example>
  [JsonPropertyOrder(1)]
  public string Name { get; set; } = string.Empty;

  /// <summary>
  /// Gets or sets an optional detailed description of the entity.
  /// This property provides additional context and information beyond the basic name.
  /// </summary>
  /// <value>
  /// A string containing a detailed description of the entity. Defaults to an empty string.
  /// Can be used for documentation, help text, or extended information display.
  /// </value>
  /// <remarks>
  /// <para>
  /// The Description property enhances entity understanding and usability:
  /// - Provides detailed explanation or context for the entity
  /// - Supports user guidance in interfaces through help text or tooltips
  /// - Enables rich content for catalogs, documentation, and reports
  /// - Facilitates full-text search scenarios beyond just name matching
  /// </para>
  /// <para>
  /// <strong>Content Guidelines:</strong>
  /// - Should provide value beyond what the name already conveys
  /// - Can include usage instructions, specifications, or business context
  /// - Consider markdown or structured text for rich formatting needs
  /// - Keep length appropriate for intended display contexts
  /// </para>
  /// <para>
  /// <strong>Optional Nature:</strong>
  /// - Can be empty for simple entities where name is self-explanatory
  /// - Length and content vary based on entity complexity and business needs
  /// - Consider character limits based on storage and display requirements
  /// - May support internationalization for multi-language deployments
  /// </para>
  /// </remarks>
  /// <example>
  /// <code>
  /// // Detailed product description
  /// product.Description = "High-quality wireless headphones with noise cancellation, " +
  ///                      "30-hour battery life, and premium audio drivers. " +
  ///                      "Compatible with all Bluetooth-enabled devices.";
  ///
  /// // Simple category description
  /// category.Description = "Products for home improvement and gardening";
  ///
  /// // Empty description for self-explanatory entities
  /// status.Name = "Active";
  /// status.Description = ""; // Name is sufficient
  /// </code>
  /// </example>
  [JsonPropertyOrder(2)]
  public string Description { get; set; } = string.Empty;
}
