import {describe, expect, it} from "vitest";
import {REGISTRY} from "../../src/hygiene/providers/registry.ts";
import {PROVIDER_DESCRIPTORS, providerIds} from "./registry.ts";

describe("lightweight provider descriptors", () => {
  it("retains every existing provider identity, label, icon, and gate", () => {
    expect(PROVIDER_DESCRIPTORS.map(({id, name, icon, defaultGate}) => ({id, name, icon, defaultGate}))).toEqual(
      REGISTRY.map(({id, name, icon, defaultGate}) => ({id, name, icon, defaultGate})),
    );
    expect(providerIds()).toEqual(REGISTRY.map((provider) => provider.id));
  });
});
