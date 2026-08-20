namespace arolariu.Backend.Domain.Invoices.Brokers.QueueBroker;

using System;

using arolariu.Backend.Common.Azure;
using arolariu.Backend.Common.Options;

using Azure.Storage.Queues;

public sealed partial class AzureStorageQueueBroker
{
  private const string AnalysisQueueName = "invoice-analysis";
  private const string AzuriteDevelopmentKey =
    "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";

  private static QueueServiceClient CreateQueueServiceClient(IOptionsManager optionsManager)
  {
    ArgumentNullException.ThrowIfNull(optionsManager);
    string blobEndpoint = optionsManager.GetApplicationOptions().StorageAccountEndpoint;
    Uri queueEndpoint = ResolveQueueEndpoint(new Uri(blobEndpoint));

    if (queueEndpoint.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase))
    {
      string connectionString =
        $"DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey={AzuriteDevelopmentKey};QueueEndpoint={queueEndpoint};";
      return new QueueServiceClient(connectionString);
    }

    return new QueueServiceClient(queueEndpoint, AzureCredentialFactory.CreateCredential());
  }

  internal static Uri ResolveQueueEndpoint(Uri blobEndpoint)
  {
    ArgumentNullException.ThrowIfNull(blobEndpoint);
    var builder = new UriBuilder(blobEndpoint);

    if (builder.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase)
        || builder.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
    {
      if (builder.Port == 10000)
      {
        builder.Port = 10001;
      }

      return builder.Uri;
    }

    builder.Host = builder.Host.Replace(".blob.", ".queue.", StringComparison.OrdinalIgnoreCase);
    return builder.Uri;
  }
}
