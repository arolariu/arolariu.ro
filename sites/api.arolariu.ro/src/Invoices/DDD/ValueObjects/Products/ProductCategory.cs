namespace arolariu.Backend.Domain.Invoices.DDD.ValueObjects.Products;

using System.Diagnostics.CodeAnalysis;

/// <summary>
/// Classifies individual line items for enrichment, allergen aggregation, nutritional analytics and budgeting segmentation.
/// </summary>
/// <remarks>
/// <para><b>Extensibility:</b> Maintain numeric spacing (increments of 100) so downstream analytical exports relying on ordered ranges remain stable.</para>
/// <para><b>Sentinel:</b> <see cref="NOT_DEFINED"/> indicates classification pending (OCR / AI enrichment or user override has not yet supplied a definitive category). SHOULD be transient.</para>
/// <para><b>Domain Usage:</b> Categories drive recipe suggestion relevance, allergen risk surfacing, basket composition insights and planned per-category spend trends.</para>
/// <para><b>Thread-safety:</b> Enum is immutable and inherently thread-safe.</para>
/// </remarks>
[SuppressMessage("Naming", "CA1707:Identifiers should not contain underscores", Justification = "Domain sentinel and grouped constants use underscores for clarity.")]
public enum ProductCategory
{
	/// <summary>Sentinel; item category not yet classified.</summary>
	NOT_DEFINED = 0,

	/// <summary>Baked goods (bread, pastries, cakes, confectionery).</summary>
	BAKED_GOODS = 100,

	/// <summary>General grocery staples and uncategorized pantry items.</summary>
	GROCERIES = 200,

	/// <summary>Dairy products (milk, cheese, yogurt, butter).</summary>
	DAIRY = 300,

	/// <summary>Meat products (red / white raw or processed).</summary>
	MEAT = 400,

	/// <summary>Fish and seafood products.</summary>
	FISH = 500,

	/// <summary>Fruit produce (fresh, dried or minimally processed).</summary>
	FRUITS = 600,

	/// <summary>Vegetable produce (fresh, dried or minimally processed).</summary>
	VEGETABLES = 700,

	/// <summary>Non-alcoholic beverages (soft drinks, juices, water, energy drinks).</summary>
	BEVERAGES = 800,

	/// <summary>Alcoholic beverages (beer, wine, spirits, mixed alcohol).</summary>
	ALCOHOLIC_BEVERAGES = 900,

	/// <summary>Tobacco products and smoking accessories.</summary>
	TOBACCO = 1000,

	/// <summary>Cleaning and household maintenance supplies.</summary>
	CLEANING_SUPPLIES = 1100,

	/// <summary>Personal hygiene and grooming products.</summary>
	PERSONAL_CARE = 1200,

	/// <summary>Over-the-counter or prescribed medicinal / pharmaceutical items.</summary>
	MEDICINE = 1300,

	/// <summary>Fallback when no defined category applies; minimize long-term usage.</summary>
	OTHER = 9999,
}
