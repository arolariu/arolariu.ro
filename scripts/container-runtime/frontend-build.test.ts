import {describe, expect, it} from "vitest";

import {selectPublicBuildEnvironment} from "../../sites/arolariu.ro/scripts/containerBuild.ts";

describe("selectPublicBuildEnvironment", () => {
  it("forwards any declared public key and CDN selection without exposing private configuration", () => {
    const environment = selectPublicBuildEnvironment({
      NEXT_PUBLIC_SERVICE_ORIGIN: "https://service.invalid",
      NEXT_PUBLIC_AUTH_ORIGIN: "https://identity.invalid",
      USE_CDN: "true",
      RUNTIME_API_KEY: "private-not-for-build",
      AUTH_SIGNING_KEY: "private-signing-key",
    });

    expect(environment).toEqual({
      NEXT_PUBLIC_SERVICE_ORIGIN: "https://service.invalid",
      NEXT_PUBLIC_AUTH_ORIGIN: "https://identity.invalid",
      USE_CDN: "true",
    });
  });

  it("does not require authentication configuration for applications without it", () => {
    expect(selectPublicBuildEnvironment({USE_CDN: "false", RUNTIME_API_KEY: "private"})).toEqual({USE_CDN: "false"});
  });
});
