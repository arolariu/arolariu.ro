/** @format */

import {getNodeAutoInstrumentations} from "@opentelemetry/auto-instrumentations-node";
import {OTLPTraceExporter} from "@opentelemetry/exporter-trace-otlp-http";
import {Resource} from "@opentelemetry/resources";
import {ConsoleMetricExporter, PeriodicExportingMetricReader} from "@opentelemetry/sdk-metrics";
import {NodeSDK} from "@opentelemetry/sdk-node";
import {BatchSpanProcessor} from "@opentelemetry/sdk-trace-node";
import {SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION} from "@opentelemetry/semantic-conventions";

const isDevelopment = process.env.NODE_ENV === "development";

const resource = Resource.default().merge(
  new Resource({
    [SEMRESATTRS_SERVICE_NAME]: "arolariu-ro",
    [SEMRESATTRS_SERVICE_VERSION]: "1.0.0",
  }),
);

const sdk = new NodeSDK({
  resource: resource,
  traceExporter: isDevelopment ? undefined : new OTLPTraceExporter(),
  metricReader: isDevelopment
    ? new PeriodicExportingMetricReader({
        exporter: new ConsoleMetricExporter(),
      })
    : undefined,
  instrumentations: [getNodeAutoInstrumentations()],
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
});

sdk.start();
