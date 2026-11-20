import {app} from "@azure/functions";
import {handleCvJsonFunction} from "../cv-json.ts";

app.http("cv-json", {
  route: "cv-json/{trailingSlash?}",
  methods: ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"],
  authLevel: "anonymous",
  handler: handleCvJsonFunction,
});
