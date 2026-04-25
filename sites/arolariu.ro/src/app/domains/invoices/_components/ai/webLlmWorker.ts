import {WebWorkerMLCEngineHandler} from "@mlc-ai/web-llm";

const handler = new WebWorkerMLCEngineHandler();

globalThis.addEventListener("message", (event: MessageEvent): void => {
  if (event.origin && event.origin !== globalThis.location.origin) {
    return;
  }

  handler.onmessage(event);
});
