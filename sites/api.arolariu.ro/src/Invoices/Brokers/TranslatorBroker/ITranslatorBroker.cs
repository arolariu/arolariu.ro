namespace arolariu.Backend.Domain.Invoices.Brokers.TranslatorBroker;

using System.Threading.Tasks;

/// <summary>
/// The translator broker interface.
/// This interface is used to translate text.
/// </summary>
public interface ITranslatorBroker
{
	/// <summary>
	/// Translates the given text to the given language.
	/// </summary>
	/// <param name="text"></param>
	/// <param name="language"></param>
	/// <returns></returns>
	public Task<string> Translate(string text, string language = "en");

	/// <summary>
	/// Detects the language of the given text.
	/// </summary>
	/// <param name="text"></param>
	/// <returns></returns>
	public Task<string> DetectLanguage(string text);
}
