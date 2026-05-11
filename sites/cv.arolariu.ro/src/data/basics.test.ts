import {describe, expect, it} from "vitest";

import {basics} from "./basics";

describe("basics (JSON Resume basics block)", () => {
  it("is frozen at runtime", () => {
    expect(Object.isFrozen(basics)).toBe(true);
  });

  it("contains the canonical identity fields", () => {
    expect(basics.name).toBeTypeOf("string");
    expect(basics.email).toMatch(/@/);
    expect(basics.url).toMatch(/^https?:\/\//);
    expect(basics.summary.length).toBeGreaterThan(0);
  });

  it("structures location with city / country / region", () => {
    expect(basics.location.city).toBe("Bucharest");
    expect(basics.location.countryCode).toBe("RO");
    expect(basics.location.region).toMatch(/Romania/);
  });

  it("exposes 3 profiles (LinkedIn, GitHub, Website)", () => {
    expect(basics.profiles).toHaveLength(3);
    const networks = basics.profiles.map((p) => p.network);
    expect(networks).toEqual(expect.arrayContaining(["LinkedIn", "GitHub", "Website"]));
  });
});
