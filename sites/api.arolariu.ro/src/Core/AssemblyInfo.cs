using System.Runtime.CompilerServices;

// Allow the core test project to exercise internal types (e.g. ExpHealthCheck)
// directly from unit tests without standing up a full WebApplication host.
[assembly: InternalsVisibleTo("arolariu.Backend.Core.Tests")]
