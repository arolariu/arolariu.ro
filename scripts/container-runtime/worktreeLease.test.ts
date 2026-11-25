// @vitest-environment node
import {Effect} from "effect";
import {link, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {describe, expect, it} from "vitest";

import {leaseFixture} from "./worktreeLease.testing.ts";
import {claimWorktreeLaunch, listenWorktreePort, readWorktreeLaunch, WorktreePlatform} from "./worktreeLease.ts";
import {openWorktreeRegistryRoute} from "./worktreePlatform.ts";

describe("worktree lease", () => {
  it("owns and disposes a fixture from a fresh checkout without planning artifacts", async () => {
    const checkout = await mkdtemp(join(await realpath(tmpdir()), "arolariu-fresh-checkout-"));
    try {
      const fixture = await leaseFixture(checkout);
      try {
        expect(fixture.checkout.root).toBe(checkout);
        expect(await readdir(checkout)).toEqual([]);
        await writeFile(join(fixture.directory, "fixture.json"), "{}", {flag: "wx"});
      } finally {
        await fixture.dispose();
      }
      await expect(readdir(fixture.directory)).rejects.toMatchObject({code: "ENOENT"});
    } finally {
      await rm(checkout, {recursive: true});
    }
  });

  it.each(["absent", "create"])("rejects a redirected ancestor before %s store access", async (mode) => {
    const root = await mkdtemp(join(await realpath(tmpdir()), "arolariu-registry-route-"));
    const target = join(root, "target");
    const localData = join(target, "Local");
    const redirected = join(root, "redirected");
    let accesses = 0;
    try {
      await mkdir(localData, {recursive: true});
      await symlink(target, redirected, process.platform === "win32" ? "junction" : "dir");
      const openStore = async (parent: string) => {
        accesses++;
        if (mode === "absent") return null;
        const store = join(parent, "store");
        await mkdir(store);
        return store;
      };
      const outcome = await Promise.allSettled([openWorktreeRegistryRoute(join(redirected, "Local"), openStore)]);
      expect.soft(outcome[0]?.status).toBe("rejected");
      expect.soft(accesses).toBe(0);
      expect.soft(await readdir(localData)).toEqual([]);
      // A canonical parent still reaches the exact same synthetic store boundary.
      expect(await openWorktreeRegistryRoute(localData, openStore)).toBe(mode === "absent" ? null : join(localData, "store"));
    } finally {
      await rm(root, {recursive: true});
    }
  });

  it("concurrent claims produce only one owner", async () => {
    const fixture = await leaseFixture();
    try {
      const claim = claimWorktreeLaunch(fixture.checkout).pipe(Effect.provideService(WorktreePlatform, fixture.platform));
      const outcomes = await Promise.allSettled([Effect.runPromise(claim), Effect.runPromise(claim)]);
      expect(outcomes.filter(({status}) => status === "fulfilled")).toHaveLength(1);
      const winner = await Effect.runPromise(
        readWorktreeLaunch(fixture.checkout).pipe(Effect.provideService(WorktreePlatform, fixture.platform)),
      );
      expect(winner).toMatchObject({phase: "reserved", root: fixture.checkout.root, engineId: "a".repeat(64)});
    } finally {
      await fixture.dispose();
    }
  });

  it("skips an occupied port without an identifiable process", async () => {
    const fixture = await leaseFixture();
    const occupied = await listenWorktreePort(0);
    let attempts = 0;
    try {
      const platform = {
        ...fixture.platform,
        candidatePort: () => (attempts++ === 0 ? occupied.port : 0),
        processIdentity: () => Promise.reject(new Error("must not inspect an unowned listener")),
      };
      const lease = await Effect.runPromise(claimWorktreeLaunch(fixture.checkout).pipe(Effect.provideService(WorktreePlatform, platform)));
      expect(Object.values(lease.ports)).not.toContain(occupied.port);
      expect(attempts).toBe(Object.keys(lease.ports).length + 1);
      await expect(listenWorktreePort(occupied.port)).rejects.toMatchObject({code: "EADDRINUSE"});
    } finally {
      await occupied.close();
      await fixture.dispose();
    }
  });

  it("does not interpret a partial lease as idle or overwrite it", async () => {
    const fixture = await leaseFixture();
    try {
      const claim = claimWorktreeLaunch(fixture.checkout).pipe(Effect.provideService(WorktreePlatform, fixture.platform));
      const lease = await Effect.runPromise(claim);
      const path = join(fixture.directory, lease.scopeId, "lease.json");
      await writeFile(path, '{"phase":"owned"}');
      const read = readWorktreeLaunch(fixture.checkout).pipe(Effect.provideService(WorktreePlatform, fixture.platform));
      await expect(Effect.runPromise(read)).rejects.toThrow();
      await expect(Effect.runPromise(claim)).rejects.toThrow();
      expect(await readFile(path, "utf8")).toBe('{"phase":"owned"}');
    } finally {
      await fixture.dispose();
    }
  });

  it("excludes ports reserved by a different scope after the reservation sockets close", async () => {
    const fixture = await leaseFixture();
    try {
      const first = await Effect.runPromise(
        claimWorktreeLaunch(fixture.checkout).pipe(Effect.provideService(WorktreePlatform, fixture.platform)),
      );
      const other = {...fixture.checkout, root: join(fixture.checkout.root, "synthetic-sibling")};
      let attempts = 0;
      const second = await Effect.runPromise(
        claimWorktreeLaunch(other).pipe(
          Effect.provideService(WorktreePlatform, {
            ...fixture.platform,
            checkout: Effect.succeed(other),
            candidatePort: () => (attempts++ === 0 ? first.ports.website : 0),
          }),
        ),
      );
      expect(second.scopeId).not.toBe(first.scopeId);
      expect(Object.values(second.ports).some((port) => Object.values(first.ports).includes(port))).toBe(false);
    } finally {
      await fixture.dispose();
    }
  });

  it("does not read a hard-linked lease or report idle after an abandoned lock", async () => {
    const fixture = await leaseFixture();
    try {
      const claim = claimWorktreeLaunch(fixture.checkout).pipe(Effect.provideService(WorktreePlatform, fixture.platform));
      const read = readWorktreeLaunch(fixture.checkout).pipe(Effect.provideService(WorktreePlatform, fixture.platform));
      const lease = await Effect.runPromise(claim);
      const snapshot = join(fixture.directory, lease.scopeId, "lease.json");
      await link(snapshot, join(fixture.directory, "not-owned.json"));
      await expect(Effect.runPromise(read)).rejects.toThrow();
      await writeFile(join(fixture.directory, "mutation.lock"), "", {flag: "wx"});
      await expect(Effect.runPromise(read)).rejects.toThrow();
      await expect(Effect.runPromise(claim)).rejects.toThrow();
    } finally {
      await fixture.dispose();
    }
  });
});
