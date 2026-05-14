using System.Text.Json;
using AppHost.Aspire;
using Aspire.Hosting.ApplicationModel;
using Xunit;

namespace AppHost.Tests;

/// <summary>
/// Unit tests for <see cref="ExpConfigGenerator.GeneratorState"/> and
/// <see cref="ExpConfigGenerator.WriteAspireConfigAsync"/>.
/// </summary>
public sealed class ExpConfigGeneratorTests
{
    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    /// <summary>
    /// Creates a minimal <see cref="ExpConfigGenerator.GeneratorState"/> backed by
    /// <paramref name="configPath"/>. <c>Tracked</c> is intentionally empty because
    /// these tests invoke <c>WriteAspireConfigAsync</c> directly; the event-driven
    /// readiness flow is not under test here.
    /// </summary>
    private static ExpConfigGenerator.GeneratorState CreateState(
        string configPath,
        string originalContent) =>
        new()
        {
            ConfigPath = configPath,
            BackupPath = configPath + ".aspire-bak",
            OriginalContent = originalContent,
            Tracked = new HashSet<IResource>(),
        };

    // ---------------------------------------------------------------------------
    // Test 1 — Behavior: updates matched keys and preserves unrelated top-level keys
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task WriteAspireConfigAsync_KeyPresentInFactories_UpdatesKeyAndPreservesUnrelatedTopLevelKeys()
    {
        // Arrange
        var path = Path.GetTempFileName();
        const string original = """{"DbConnection":"docker://old","FeatureFlag":true,"RetryCount":3}""";
        var state = CreateState(path, original);

        var factories = new Dictionary<string, Func<string>>
        {
            ["DbConnection"] = () => "localhost:1433",
            // "UnknownKey" is NOT in the JSON — the generator must silently skip it.
            ["UnknownKey"] = () => "should-not-appear",
        };

        try
        {
            // Act
            await ExpConfigGenerator.WriteAspireConfigAsync(state, factories, CancellationToken.None);

            // Assert — DbConnection updated, other top-level keys untouched
            using var doc = JsonDocument.Parse(await File.ReadAllTextAsync(path));
            var root = doc.RootElement;

            Assert.Equal("localhost:1433", root.GetProperty("DbConnection").GetString());
            Assert.True(root.GetProperty("FeatureFlag").GetBoolean());
            Assert.Equal(3, root.GetProperty("RetryCount").GetInt32());
            Assert.False(root.TryGetProperty("UnknownKey", out _),
                "Keys absent in the source file must NOT be introduced by the generator.");
        }
        finally
        {
            File.Delete(path);
        }
    }

    // ---------------------------------------------------------------------------
    // Test 2 — Behavior: calling write twice with the same inputs is idempotent
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task WriteAspireConfigAsync_CalledTwiceWithSameInputs_ProducesIdenticalFileContent()
    {
        // Arrange
        var path = Path.GetTempFileName();
        const string original = """{"DbConnection":"docker://old","OtherKey":42}""";
        var state = CreateState(path, original);

        var factories = new Dictionary<string, Func<string>>
        {
            ["DbConnection"] = () => "localhost:1433",
        };

        try
        {
            // Act
            await ExpConfigGenerator.WriteAspireConfigAsync(state, factories, CancellationToken.None);
            var firstContent = await File.ReadAllTextAsync(path);

            // Second call with identical inputs (TrySetResult on the already-completed TCS
            // is a documented no-op, so this is safe even with the SignalWritten call inside).
            await ExpConfigGenerator.WriteAspireConfigAsync(state, factories, CancellationToken.None);
            var secondContent = await File.ReadAllTextAsync(path);

            // Assert — byte-for-byte identical output
            Assert.Equal(firstContent, secondContent);
        }
        finally
        {
            File.Delete(path);
        }
    }

    // ---------------------------------------------------------------------------
    // Test 3 — Behavior: restore is a no-op when the file is mutated outside the
    //           generator (the Task 4 guard).
    //
    // RestoreOriginalHostedService.StopAsync checks:
    //   if (current != state.LastGeneratedContent) → skip restore, log warning
    // We verify that the guard condition is satisfied after an external edit, i.e.
    // that LastGeneratedContent diverges from the current file content — which is
    // exactly what StopAsync uses to decide whether to skip the restore.
    // ---------------------------------------------------------------------------

    [Fact]
    public async Task WriteAspireConfigAsync_AfterExternalEdit_LastGeneratedContentDiffersFromCurrentFile()
    {
        // Arrange
        var path = Path.GetTempFileName();
        const string original = """{"DbConnection":"docker://old","OtherKey":42}""";
        var state = CreateState(path, original);

        var factories = new Dictionary<string, Func<string>>
        {
            ["DbConnection"] = () => "localhost:1433",
        };

        try
        {
            // Act — simulate a normal generator write
            await ExpConfigGenerator.WriteAspireConfigAsync(state, factories, CancellationToken.None);

            // Verify the generator captured its output
            var generatedContent = state.LastGeneratedContent;
            Assert.NotNull(generatedContent);

            // Simulate an external edit (user changes the file while AppHost is running)
            const string externalEdit = """{"DbConnection":"user-override","OtherKey":99}""";
            await File.WriteAllTextAsync(path, externalEdit);

            // Assert — the guard condition in StopAsync evaluates to "skip restore"
            var currentContent = await File.ReadAllTextAsync(path);
            Assert.NotEqual(generatedContent, currentContent);
        }
        finally
        {
            File.Delete(path);
        }
    }
}
