using System.Runtime.CompilerServices;

// Allow the domain test project to exercise internal endpoint handlers (e.g.,
// RetrieveSpecificInvoiceAsync, CreateNewInvoiceAsync) directly from integration-style
// tests that validate exception-to-HTTP-status wiring without standing up a full
// WebApplication host.
[assembly: InternalsVisibleTo("arolariu.Backend.Domain.Tests")]
