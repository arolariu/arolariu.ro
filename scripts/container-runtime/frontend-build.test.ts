import {describe, expect, it} from "vitest";

import {selectPublicBuildEnvironment} from "../../sites/arolariu.ro/scripts/containerBuild.ts";

describe("selectPublicBuildEnvironment", () => {
  it("forwards any declared public key without exposing private configuration", () => {
    const environment = selectPublicBuildEnvironment({
      NEXT_PUBLIC_SERVICE_ORIGIN: "https://service.invalid",
      NEXT_PUBLIC_AUTH_ORIGIN: "https://identity.invalid",
      RUNTIME_API_KEY: "private-not-for-build",
      AUTH_SIGNING_KEY: "private-signing-key",
    });

    expect(environment).toEqual({
      NEXT_PUBLIC_SERVICE_ORIGIN: "https://service.invalid",
      NEXT_PUBLIC_AUTH_ORIGIN: "https://identity.invalid",
    });
  });

  it("does not let the build secret override build-argument site configuration", () => {
    expect(selectPublicBuildEnvironment({SITE_URL: "https://arolariu.ro", RUNTIME_API_KEY: "private"})).toEqual({});
  });
});
