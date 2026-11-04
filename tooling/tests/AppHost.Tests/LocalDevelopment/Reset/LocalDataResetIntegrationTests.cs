namespace AppHost.Tests.LocalDevelopment.Reset;

using System.Data.Common;
using System.Diagnostics;
using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using arolariu.Backend.Common.Options;
using arolariu.Backend.Core.Auth.Endpoints;
using arolariu.Backend.Core.Auth.Models;
using arolariu.Backend.Core.Auth.Modules;
using Aspire.Hosting.ApplicationModel;
using Azure.Data.Tables;
using Azure.Storage.Blobs;
using Azure.Storage.Queues;
using global::AppHost.Tests.LocalDevelopment.Reset.Fixtures;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Newtonsoft.Json.Linq;

/// <summary>Proves the registered reset using real stores, Bootstrap, DCP lifecycle, and controlled HTTP processes.</summary>
[TestClass]
[TestCategory("LocalDataIntegration")]
[DoNotParallelize]
public sealed class LocalDataResetIntegrationTests
{
  /// <summary>Cancellation terminates actual native writers during blocked SDK work or partial application resumption.</summary>
  [TestMethod]
  [DataRow("bootstrap")]
  [DataRow("resume")]
  public async Task ResetLocalData_CancelledNativeWork_TerminatesWritersBeforeReturning(string phase)
  {
    if (Environment.GetEnvironmentVariable("AROLARIU_RUN_LOCAL_DATA_TESTS") != "1")
    {
      Assert.Inconclusive("Native store integration requires explicit AROLARIU_RUN_LOCAL_DATA_TESTS=1.");
    }
    Assert.IsTrue(Environment.GetEnvironmentVariable("AROLARIU_CONTAINER_ENGINE") is "rancher" or "podman");
    string scope = $"arolariu-seed-tests-{Guid.NewGuid():N}";
    string password = $"{Convert.ToHexString(RandomNumberGenerator.GetBytes(18))}aA1!";
    string healthFile = Path.Combine(Path.GetTempPath(), $"{scope}.health");
    using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(5));
    using var commandCancellation = CancellationTokenSource.CreateLinkedTokenSource(timeout.Token);
    await using var gate = new BootstrapConnectionGate();
    NativeResetFixture? fixture = null;
    Task<ExecuteCommandResult>? pending = null;
    var children = new List<Process>();
    try
    {
      await File.WriteAllTextAsync(healthFile, "healthy", timeout.Token);
      fixture = await NativeResetFixture.StartAsync(scope, password, timeout.Token,
        phase == "bootstrap" ? gate : null, healthFile);
      DateTime? previousSeed = Current(fixture, "local-bootstrap").Snapshot.StartTimeStamp;
      DateTime? previousWebsite = Current(fixture, "website").Snapshot.StartTimeStamp;
      if (phase == "bootstrap") { gate.HoldConnections(); }
      else { File.Delete(healthFile); }
      fixture.Confirmation.Approved = true;

      pending = fixture.Commands.ExecuteCommandAsync(
        fixture.Resources.Helpers.Bootstrap.Resource, "reset-local-data", commandCancellation.Token);
      if (phase == "bootstrap")
      {
        await gate.Held.Task.WaitAsync(timeout.Token);
        ResourceEvent seed = Current(fixture, "local-bootstrap");
        Assert.AreEqual(KnownResourceStates.Running, seed.Snapshot.State?.Text);
        Assert.AreNotEqual(previousSeed, seed.Snapshot.StartTimeStamp);
        children.Add(CaptureProcess(seed));
      }
      else
      {
        ResourceEvent website = await fixture.Notifications.WaitForResourceAsync("website", change =>
          change.Snapshot.State?.Text == KnownResourceStates.Running
          && change.Snapshot.StartTimeStamp != previousWebsite, timeout.Token);
        children.Add(CaptureProcess(Current(fixture, "api")));
        children.Add(CaptureProcess(website));
      }
      Assert.IsFalse(pending.IsCompleted);
      commandCancellation.Cancel();

      ExecuteCommandResult canceled = await pending;

      Assert.IsFalse(canceled.Success);
      StringAssert.Contains(canceled.Message, "Writers remain stopped");
      foreach (Process child in children)
      {
        Assert.IsTrue(child.HasExited, "Reset must await actual native child-process termination.");
      }
      foreach (string writer in new[] { "website", "api", "local-bootstrap" })
      {
        string? state = Current(fixture, writer).Snapshot.State?.Text;
        Assert.IsTrue(state == KnownResourceStates.Exited || state == KnownResourceStates.Finished
          || state == KnownResourceStates.NotStarted || state == KnownResourceStates.FailedToStart,
          $"The native writer {writer} must be stopped before reset returns.");
      }
      if (phase == "bootstrap") { await gate.Disconnected.Task.WaitAsync(TimeSpan.FromSeconds(5), timeout.Token); }
    }
    finally
    {
      try
      {
        commandCancellation.Cancel();
        if (pending is not null) { await pending.WaitAsync(TimeSpan.FromSeconds(40)); }
      }
      finally
      {
        foreach (Process child in children) { child.Dispose(); }
        try { if (fixture is not null) { await fixture.DisposeAsync(); } }
        finally
        {
          try { await NativeResetFixture.DeleteVolumesAsync(scope); }
          finally { File.Delete(healthFile); }
        }
      }
    }
  }

  /// <summary>A stopped native store cannot authorize deletion through its retained endpoint allocation.</summary>
  [TestMethod]
  public async Task ResetLocalData_StoppedInfrastructure_RefusesBeforeStoppingWritersOrClearingData()
  {
    if (Environment.GetEnvironmentVariable("AROLARIU_RUN_LOCAL_DATA_TESTS") != "1")
    {
      Assert.Inconclusive("Native store integration requires explicit AROLARIU_RUN_LOCAL_DATA_TESTS=1.");
    }
    Assert.IsTrue(Environment.GetEnvironmentVariable("AROLARIU_CONTAINER_ENGINE") is "rancher" or "podman");
    string scope = $"arolariu-seed-tests-{Guid.NewGuid():N}";
    string password = $"{Convert.ToHexString(RandomNumberGenerator.GetBytes(18))}aA1!";
    using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(3));
    NativeResetFixture? fixture = null;
    try
    {
      fixture = await NativeResetFixture.StartAsync(scope, password, timeout.Token);
      using CosmosClient cosmos = await CosmosAsync(fixture, timeout.Token);
      await cosmos.GetContainer("primary", "invoices").CreateItemAsync(
        new { id = "unrelated-store-guard", UserIdentifier = "custom-owner" },
        new PartitionKey("custom-owner"), cancellationToken: timeout.Token);
      DateTime? apiStart = Current(fixture, "api").Snapshot.StartTimeStamp;
      ExecuteCommandResult stopped = await fixture.Commands.ExecuteCommandAsync(
        fixture.Resources.Infrastructure.Storage.Resource, KnownResourceCommands.StopCommand, timeout.Token);
      Assert.IsTrue(stopped.Success, stopped.Message);
      await fixture.Notifications.WaitForResourceAsync("storage",
        change => change.Snapshot.State?.Text == KnownResourceStates.Exited, timeout.Token);
      fixture.Confirmation.Approved = true;
      using var commandTimeout = new CancellationTokenSource(TimeSpan.FromSeconds(12));

      ExecuteCommandResult refused = await fixture.Commands.ExecuteCommandAsync(
        fixture.Resources.Helpers.Bootstrap.Resource, "reset-local-data", commandTimeout.Token);

      Assert.IsFalse(refused.Success);
      StringAssert.Contains(refused.Message, "target validation");
      Assert.AreEqual(KnownResourceStates.Running, Current(fixture, "api").Snapshot.State?.Text);
      Assert.AreEqual(apiStart, Current(fixture, "api").Snapshot.StartTimeStamp);
      using ResponseMessage preserved = await cosmos.GetContainer("primary", "invoices").ReadItemStreamAsync(
        "unrelated-store-guard", new PartitionKey("custom-owner"), cancellationToken: timeout.Token);
      Assert.AreEqual(HttpStatusCode.OK, preserved.StatusCode);
    }
    finally
    {
      if (fixture is not null) { await fixture.DisposeAsync(); }
      await NativeResetFixture.DeleteVolumesAsync(scope);
    }
  }

  /// <summary>Custom data survives native host recreation and only an explicitly confirmed reset removes it.</summary>
  [TestMethod]
  public async Task ResetLocalData_NativeLifecycle_PreservesUntilConfirmedThenRestoresPersonas()
  {
    if (Environment.GetEnvironmentVariable("AROLARIU_RUN_LOCAL_DATA_TESTS") != "1")
    {
      Assert.Inconclusive("Native store integration requires explicit AROLARIU_RUN_LOCAL_DATA_TESTS=1.");
    }
    Assert.IsTrue(Environment.GetEnvironmentVariable("AROLARIU_CONTAINER_ENGINE") is "rancher" or "podman");
    string scope = $"arolariu-seed-tests-{Guid.NewGuid():N}";
    string password = $"{Convert.ToHexString(RandomNumberGenerator.GetBytes(18))}aA1!";
    using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(5));
    NativeResetFixture? first = null;
    NativeResetFixture? second = null;
    try
    {
      first = await NativeResetFixture.StartAsync(scope, password, timeout.Token);
      await AddCustomDataAsync(first, timeout.Token);
      first.Confirmation.Approved = false;
      ExecuteCommandResult declined = await first.Commands.ExecuteCommandAsync(
        first.Resources.Helpers.Bootstrap.Resource, "reset-local-data", timeout.Token);
      Assert.IsTrue(declined.Canceled);
      await AssertCustomDataAsync(first, timeout.Token);
      await first.DisposeAsync();
      first = null;

      second = await NativeResetFixture.StartAsync(scope, password, timeout.Token);
      await AssertCustomDataAsync(second, timeout.Token);
      second.Confirmation.Approved = true;

      Stopwatch resetTime = Stopwatch.StartNew();
      ExecuteCommandResult reset = await second.Commands.ExecuteCommandAsync(
        second.Resources.Helpers.Bootstrap.Resource, "reset-local-data", timeout.Token);
      Console.WriteLine($"Native confirmed reset duration: {resetTime.Elapsed}.");

      Assert.IsTrue(reset.Success, reset.Message);
      Assert.AreEqual(1, second.Confirmation.Prompts);
      await AssertResetDataAsync(second, timeout.Token);
      Assert.AreEqual(KnownResourceStates.Running,
        Current(second, "api").Snapshot.State?.Text);
      Assert.AreEqual(KnownResourceStates.Running,
        Current(second, "website").Snapshot.State?.Text);
    }
    finally
    {
      if (first is not null) { await first.DisposeAsync(); }
      if (second is not null) { await second.DisposeAsync(); }
      await NativeResetFixture.DeleteVolumesAsync(scope);
    }
  }

  /// <summary>A legacy receipt blocking startup still permits the guarded, confirmed upgrade reset.</summary>
  [TestMethod]
  public async Task ResetLocalData_LegacyReceiptBlockedInitializer_ConfirmedResetRestoresCurrentScenario()
  {
    if (Environment.GetEnvironmentVariable("AROLARIU_RUN_LOCAL_DATA_TESTS") != "1")
    {
      Assert.Inconclusive("Native store integration requires explicit AROLARIU_RUN_LOCAL_DATA_TESTS=1.");
    }
    Assert.IsTrue(Environment.GetEnvironmentVariable("AROLARIU_CONTAINER_ENGINE") is "rancher" or "podman");
    string scope = $"arolariu-seed-tests-{Guid.NewGuid():N}";
    string password = $"{Convert.ToHexString(RandomNumberGenerator.GetBytes(18))}aA1!";
    using var timeout = new CancellationTokenSource(TimeSpan.FromMinutes(5));
    NativeResetFixture? first = null;
    NativeResetFixture? second = null;
    try
    {
      first = await NativeResetFixture.StartAsync(scope, password, timeout.Token);
      await AddCustomDataAsync(first, timeout.Token);
      using (CosmosClient cosmos = await CosmosAsync(first, timeout.Token))
      {
        Container state = cosmos.GetContainer("primary", "local-development");
        JObject receipt = (await state.ReadItemAsync<JObject>("invoice-scenario",
          new PartitionKey("invoice-scenario"), cancellationToken: timeout.Token)).Resource;
        receipt["manifestVersion"] = "v2";
        await state.ReplaceItemAsync(receipt, "invoice-scenario", new PartitionKey("invoice-scenario"),
          cancellationToken: timeout.Token);
      }
      await first.DisposeAsync();
      first = null;

      second = await NativeResetFixture.StartAsync(scope, password, timeout.Token, waitForApplications: false);
      Assert.AreEqual(1, Current(second, "local-bootstrap").Snapshot.ExitCode);
      foreach (string dependency in new[] { "exp", "local-identities" })
      {
        await second.Notifications.WaitForResourceAsync(dependency,
          change => change.Snapshot.State?.Text == KnownResourceStates.FailedToStart, timeout.Token);
      }
      await AssertCustomDataAsync(second, timeout.Token);
      second.Confirmation.Approved = true;
      ExecuteCommandResult reset = await second.Commands.ExecuteCommandAsync(
        second.Resources.Helpers.Bootstrap.Resource, "reset-local-data", timeout.Token);

      Assert.IsTrue(reset.Success, reset.Message);
      await AssertResetDataAsync(second, timeout.Token);
      Assert.AreEqual(KnownResourceStates.Running, Current(second, "api").Snapshot.State?.Text);
      Assert.AreEqual(KnownResourceStates.Running, Current(second, "website").Snapshot.State?.Text);
      Assert.AreEqual(KnownResourceStates.Running, Current(second, "exp").Snapshot.State?.Text);
      Assert.AreEqual(KnownResourceStates.Running, Current(second, "local-identities").Snapshot.State?.Text);
    }
    finally
    {
      if (first is not null) { await first.DisposeAsync(); }
      if (second is not null) { await second.DisposeAsync(); }
      await NativeResetFixture.DeleteVolumesAsync(scope);
    }
  }

  private static async Task AddCustomDataAsync(NativeResetFixture fixture, CancellationToken token)
  {
    using CosmosClient cosmos = await CosmosAsync(fixture, token);
    Container invoices = cosmos.GetContainer("primary", "invoices");
    await invoices.CreateItemAsync(new { id = "custom-invoice", UserIdentifier = "custom-owner", Name = "preserve" },
      new PartitionKey("custom-owner"), cancellationToken: token);
    using JsonDocument manifest = JsonDocument.Parse(await File.ReadAllTextAsync(
      Path.Combine(AppContext.BaseDirectory, "SeedData", "alice.json"), token));
    JsonElement first = manifest.RootElement.GetProperty("invoices").EnumerateArray()
      .Single(invoice => invoice.GetProperty("key").GetString() == "invoice/alice-weekly-groceries");
    JsonElement deleted = manifest.RootElement.GetProperty("invoices").EnumerateArray()
      .Single(invoice => invoice.GetProperty("key").GetString() == "invoice/alice-riverside-topup");
    string owner = manifest.RootElement.GetProperty("personas").EnumerateArray()
      .Single(persona => persona.GetProperty("key").GetString() == first.GetProperty("ownerKey").GetString())
      .GetProperty("userIdentifier").GetString() ?? throw new InvalidOperationException();
    string id = first.GetProperty("id").GetString() ?? throw new InvalidOperationException();
    JObject document = (await invoices.ReadItemAsync<JObject>(id, new PartitionKey(owner), cancellationToken: token)).Resource;
    document["Name"] = "edited by developer";
    await invoices.ReplaceItemAsync(document, id, new PartitionKey(owner), cancellationToken: token);
    await invoices.DeleteItemAsync<JObject>(deleted.GetProperty("id").GetString(),
      new PartitionKey(owner), cancellationToken: token);
    var blobs = new BlobServiceClient(await fixture.ConnectionAsync(fixture.Resources.Infrastructure.Blobs.Resource, token));
    await blobs.GetBlobContainerClient("invoices").GetBlobClient("custom.bin")
      .UploadAsync(BinaryData.FromString("preserve"), cancellationToken: token);
    var queues = new QueueServiceClient(await fixture.ConnectionAsync(fixture.Resources.Infrastructure.Queues.Resource, token));
    await queues.GetQueueClient("invoice-analysis").SendMessageAsync("preserve", token);
    var tables = new TableServiceClient(await fixture.ConnectionAsync(fixture.Resources.Infrastructure.Tables.Resource, token));
    await tables.CreateTableAsync("CustomRows", token);
    await tables.GetTableClient("CustomRows").AddEntityAsync(new TableEntity("partition", "row") { ["Value"] = "preserve" }, token);
    await using DbConnection sql = await fixture.SqlAsync(token);
    await using DbCommand command = sql.CreateCommand();
    command.CommandText = "CREATE TABLE dbo.PersistedMarker ([Value] nvarchar(32)); INSERT INTO dbo.PersistedMarker VALUES (N'preserve');";
    await command.ExecuteNonQueryAsync(token);
  }

  private static async Task AssertCustomDataAsync(NativeResetFixture fixture, CancellationToken token)
  {
    using CosmosClient cosmos = await CosmosAsync(fixture, token);
    Container invoices = cosmos.GetContainer("primary", "invoices");
    using ResponseMessage response = await invoices.ReadItemStreamAsync("custom-invoice",
      new PartitionKey("custom-owner"), cancellationToken: token);
    Assert.AreEqual(HttpStatusCode.OK, response.StatusCode);
    var records = new List<JObject>();
    using FeedIterator<JObject> iterator = invoices.GetItemQueryIterator<JObject>("SELECT * FROM c");
    while (iterator.HasMoreResults) { records.AddRange(await iterator.ReadNextAsync(token)); }
    Assert.IsTrue(records.Any(record => record.Value<string>("Name") == "edited by developer"));
    Assert.HasCount(1326, records);
    var blobs = new BlobServiceClient(await fixture.ConnectionAsync(fixture.Resources.Infrastructure.Blobs.Resource, token));
    Assert.AreEqual("preserve", (await blobs.GetBlobContainerClient("invoices").GetBlobClient("custom.bin")
      .DownloadContentAsync(token)).Value.Content.ToString());
    var queues = new QueueServiceClient(await fixture.ConnectionAsync(fixture.Resources.Infrastructure.Queues.Resource, token));
    Assert.IsTrue((await queues.GetQueueClient("invoice-analysis").PeekMessagesAsync(cancellationToken: token))
      .Value.Any(message => message.Body.ToString() == "preserve"));
    var tables = new TableServiceClient(await fixture.ConnectionAsync(fixture.Resources.Infrastructure.Tables.Resource, token));
    Assert.AreEqual("preserve", (await tables.GetTableClient("CustomRows").GetEntityAsync<TableEntity>("partition", "row",
      cancellationToken: token)).Value.GetString("Value"));
    await using DbConnection sql = await fixture.SqlAsync(token);
    await using DbCommand command = sql.CreateCommand();
    command.CommandText = "SELECT [Value] FROM dbo.PersistedMarker;";
    Assert.AreEqual("preserve", await command.ExecuteScalarAsync(token));
  }

  private static async Task AssertResetDataAsync(NativeResetFixture fixture, CancellationToken token)
  {
    using CosmosClient cosmos = await CosmosAsync(fixture, token);
    var invoices = new List<JObject>();
    var merchants = new List<JObject>();
    using (FeedIterator<JObject> iterator = cosmos.GetContainer("primary", "invoices").GetItemQueryIterator<JObject>("SELECT * FROM c"))
    {
      while (iterator.HasMoreResults) { invoices.AddRange(await iterator.ReadNextAsync(token)); }
    }
    using (FeedIterator<JObject> iterator = cosmos.GetContainer("primary", "merchants").GetItemQueryIterator<JObject>("SELECT * FROM c"))
    {
      while (iterator.HasMoreResults) { merchants.AddRange(await iterator.ReadNextAsync(token)); }
    }
    foreach (string key in new[] { "alice", "bob", "charlie", "dmitryi" })
    {
      using JsonDocument manifest = JsonDocument.Parse(await File.ReadAllTextAsync(
        Path.Combine(AppContext.BaseDirectory, "SeedData", $"{key}.json"), token));
      JsonElement persona = manifest.RootElement.GetProperty("personas").EnumerateArray().Single();
      string? owner = persona.GetProperty("userIdentifier").GetString();
      int expectedActive = key switch { "alice" => 300, "bob" => 5, "charlie" => 20, _ => 1000 };
      int expectedMerchants = key switch { "alice" => 100, "bob" => 4, "charlie" => 7, _ => 250 };
      Assert.AreEqual(expectedActive, invoices.Count(invoice =>
        invoice.Value<string>("UserIdentifier") == owner && !invoice.Value<bool>("IsSoftDeleted")));
      Assert.AreEqual(expectedMerchants, merchants.Count(merchant => merchant.Value<string>("CreatedBy") == owner));
    }
    Assert.HasCount(1326, invoices);
    Assert.HasCount(361, merchants);
    using (CosmosClient stateClient = await CosmosAsync(fixture, token))
    {
      JObject receipt = (await stateClient.GetContainer("primary", "local-development").ReadItemAsync<JObject>(
        "invoice-scenario", new PartitionKey("invoice-scenario"), cancellationToken: token)).Resource;
      Assert.AreEqual("v3", receipt.Value<string>("manifestVersion"));
      Assert.IsTrue(receipt.Value<bool>("completed"));
    }
    Assert.AreEqual(18000, invoices.Where(invoice =>
      invoice.Value<string>("UserIdentifier") == "2e92f011-8157-564d-a059-af27f4026fd6"
      && !invoice.Value<bool>("IsSoftDeleted")).Sum(invoice => invoice["Items"]?.Count() ?? 0));
    foreach (JObject merchant in merchants)
    {
      string? id = merchant.Value<string>("id");
      JObject[] referenced = invoices.Where(invoice => invoice.Value<string>("MerchantReference") == id).ToArray();
      CollectionAssert.AreEquivalent(referenced.Select(invoice => invoice.Value<string>("id")).ToArray(),
        merchant["ReferencedInvoices"]?.Values<string>().ToArray() ?? []);
      Assert.IsTrue(referenced.All(invoice => invoice.Value<string>("UserIdentifier") == merchant.Value<string>("CreatedBy")));
    }
    Assert.IsFalse(invoices.Any(invoice => invoice.Value<string>("id") == "custom-invoice"));
    var blobs = new BlobServiceClient(await fixture.ConnectionAsync(fixture.Resources.Infrastructure.Blobs.Resource, token));
    Assert.IsFalse((await blobs.GetBlobContainerClient("invoices").GetBlobClient("custom.bin").ExistsAsync(token)).Value);
    var queues = new QueueServiceClient(await fixture.ConnectionAsync(fixture.Resources.Infrastructure.Queues.Resource, token));
    Assert.HasCount(0, (await queues.GetQueueClient("invoice-analysis").PeekMessagesAsync(cancellationToken: token)).Value);
    var tables = new TableServiceClient(await fixture.ConnectionAsync(fixture.Resources.Infrastructure.Tables.Resource, token));
    await foreach (var table in tables.QueryAsync(cancellationToken: token))
    {
      Assert.AreNotEqual("CustomRows", table.Name);
    }
    await using DbConnection sql = await fixture.SqlAsync(token);
    await using DbCommand command = sql.CreateCommand();
    command.CommandText = "SELECT OBJECT_ID(N'dbo.PersistedMarker');";
    Assert.AreEqual(DBNull.Value, await command.ExecuteScalarAsync(token));
    await AssertIdentityRegistrationAndLoginAsync(
      await fixture.ConnectionAsync(fixture.Resources.Infrastructure.SqlDatabase.Resource, token), token);
  }

  private static async Task AssertIdentityRegistrationAndLoginAsync(string connectionString, CancellationToken token)
  {
    var builder = WebApplication.CreateBuilder(new WebApplicationOptions { Args = [], EnvironmentName = "Development" });
    builder.WebHost.UseUrls("http://127.0.0.1:0");
    builder.Logging.ClearProviders();
    builder.Services.Configure<LocalOptions>(options =>
    {
      options.SqlConnectionString = connectionString;
      options.JwtIssuer = "https://reset-fixture.invalid";
      options.JwtAudience = "https://reset-fixture-api.invalid";
      options.JwtSecret = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
    });
    builder.Services.AddSingleton<IOptionsManager, LocalOptionsManager>();
    builder.Services.AddDataProtection().UseEphemeralDataProtectionProvider();
    builder.AddAuthServices();
    await using WebApplication app = builder.Build();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapAuthEndpoints();
    await app.StartAsync(token);
    try
    {
      using var client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()) };
      const string email = "reset-regression@example.invalid";
      string password = $"{Convert.ToHexString(RandomNumberGenerator.GetBytes(18))}aA1!";
      using HttpResponseMessage registration = await client.PostAsJsonAsync("/auth/register", new { email, password }, token);
      Assert.AreEqual(HttpStatusCode.OK, registration.StatusCode,
        "A successful reset must restore the real SQL-backed registration endpoint, not only an empty database.");
      using HttpResponseMessage unconfirmed = await client.PostAsJsonAsync("/auth/login", new { email, password }, token);
      Assert.AreEqual(HttpStatusCode.Unauthorized, unconfirmed.StatusCode,
        "Schema recovery must not weaken the existing email-confirmation policy.");
      await using (AsyncServiceScope scope = app.Services.CreateAsyncScope())
      {
        UserManager<AuthenticatedUser> users = scope.ServiceProvider.GetRequiredService<UserManager<AuthenticatedUser>>();
        AuthenticatedUser? user = await users.FindByEmailAsync(email);
        Assert.IsNotNull(user);
        string confirmation = await users.GenerateEmailConfirmationTokenAsync(user);
        Assert.IsTrue((await users.ConfirmEmailAsync(user, confirmation)).Succeeded);
      }
      using HttpResponseMessage incorrect = await client.PostAsJsonAsync("/auth/login", new { email, password = password + "wrong" }, token);
      Assert.AreEqual(HttpStatusCode.Unauthorized, incorrect.StatusCode);
      using HttpResponseMessage login = await client.PostAsJsonAsync("/auth/login", new { email, password }, token);
      Assert.AreEqual(HttpStatusCode.OK, login.StatusCode);
      using JsonDocument result = await JsonDocument.ParseAsync(await login.Content.ReadAsStreamAsync(token), cancellationToken: token);
      Assert.IsFalse(string.IsNullOrEmpty(result.RootElement.GetProperty("accessToken").GetString()));
    }
    finally
    {
      await app.StopAsync(CancellationToken.None);
    }
  }

  private static async Task<CosmosClient> CosmosAsync(NativeResetFixture fixture, CancellationToken token) =>
    new(await fixture.ConnectionAsync(fixture.Resources.Infrastructure.Cosmos.Resource, token),
      new CosmosClientOptions { ConnectionMode = ConnectionMode.Gateway, LimitToEndpoint = true });

  private static ResourceEvent Current(NativeResetFixture fixture, string name) =>
    fixture.Notifications.TryGetCurrentState(name, out ResourceEvent? state)
      ? state : throw new InvalidOperationException("Native resource snapshot is missing.");

  private static Process CaptureProcess(ResourceEvent change)
  {
    string? value = change.Snapshot.Properties.Where(property => property.Name == "executable.pid")
      .Select(property => property.Value?.ToString()).SingleOrDefault();
    Assert.IsTrue(int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out int pid),
      "A running native executable must expose its actual process ID.");
    Process process = Process.GetProcessById(pid);
    _ = process.Handle;
    return process;
  }
}
