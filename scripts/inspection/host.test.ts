// @vitest-environment node
/**
 * @fileoverview Contract tests for the pure systeminformation host projection.
 * @module scripts/inspection/host.test
 */

import {describe, expect, it} from "vitest";

import {projectSystemInformation, type HostFacts, type SystemInformationProjectionInput} from "./host.ts";

/** A distinctive, absolute Windows repository root reused across the sensitive-fixture tests. */
const REPOSITORY_ROOT = "C:\\Users\\dev\\arolariu";

function baseInput(overrides: Partial<SystemInformationProjectionInput> = {}): SystemInformationProjectionInput {
  return {
    repositoryRoot: REPOSITORY_ROOT,
    requiredPorts: [3000, 5432, 6379],
    repositoryContainerNames: ["arolariu-sql", "arolariu-redis"],
    ...overrides,
  };
}

/**
 * Builds a full, valid `getAllData()`-shaped document seeded with distinctive sensitive literals in
 * every field the projection must discard, plus optional Docker aggregates Task 9 will attach.
 */
function sensitiveHostValue(): Record<string, unknown> {
  return {
    os: {
      platform: "win32",
      distro: "Microsoft Windows 11 Pro",
      release: "10.0.22631",
      arch: "x64",
      hostname: "DESKTOP-SECRET01",
      fqdn: "desktop-secret01.corp.local",
      serial: "PC-SERIAL-99887766",
      uefi: true,
    },
    cpu: {
      brand: "AMD Ryzen 9 5900X 12-Core",
      cores: 24,
      physicalCores: 12,
      virtualization: true,
      vendor: "AuthenticAMD",
    },
    mem: {total: 68719476736, used: 20000000000, available: 48000000000, free: 48719476736},
    currentLoad: {currentLoad: 17.25, avgLoad: 1.2},
    fsSize: [
      {fs: "C:", type: "NTFS", size: 1000000000000, used: 400000000000, available: 600000000000, use: 40, mount: "C:\\"},
      {
        fs: "\\\\.\\PHYSICALDRIVE-SECRET",
        type: "NTFS",
        size: 500000000000,
        used: 100000000000,
        available: 400000000000,
        use: 20,
        mount: "D:\\SecretMountPoint",
      },
    ],
    processes: {
      all: 300,
      running: 5,
      blocked: 1,
      sleeping: 294,
      list: [
        {
          pid: 4242,
          name: "postgres.exe",
          user: "secretuser",
          command: "C:\\Program Files\\PostgreSQL\\bin\\postgres.exe --secret-flag",
          params: "--config=/secret/pg.conf",
          path: "C:\\Program Files\\PostgreSQL\\bin\\postgres.exe",
        },
        {
          pid: 7777,
          name: "node.exe",
          user: "secretuser",
          command: "node C:\\Users\\dev\\arolariu\\node_modules\\.bin\\next dev",
          params: "--port 3000",
          path: "C:\\Users\\dev\\arolariu\\node_modules\\.bin\\node.exe",
        },
      ],
    },
    networkConnections: [
      {protocol: "tcp", localAddress: "0.0.0.0", localPort: "5432", peerAddress: "0.0.0.0", peerPort: "0", state: "LISTEN", pid: 4242, process: "postgres"},
      {protocol: "tcp6", localAddress: "::", localPort: "5432", peerAddress: "::", peerPort: "0", state: "LISTEN", pid: 4242, process: "postgres"},
      {protocol: "tcp", localAddress: "192.168.1.99", localPort: "3000", peerAddress: "10.20.30.40", peerPort: "52344", state: "ESTABLISHED", pid: 7777, process: "node"},
      {protocol: "tcp", localAddress: "127.0.0.1", localPort: "3000", peerAddress: "0.0.0.0", peerPort: "0", state: "LISTEN", pid: 7777, process: "node"},
      {protocol: "tcp", localAddress: "0.0.0.0", localPort: "6379", peerAddress: "0.0.0.0", peerPort: "0", state: "LISTEN", pid: 9999, process: "redis-server"},
    ],
    net: [
      {iface: "Ethernet", default: true, operstate: "up", ip4: "192.168.1.99", ip6: "fe80::secretlink", mac: "AA:BB:CC:DD:EE:FF", internal: false},
      {iface: "Wi-Fi", default: false, operstate: "down", ip4: "10.0.0.5", mac: "11:22:33:44:55:66", internal: false},
    ],
    inetLatency: 14.5,
    dockerInfo: {
      containers: 5,
      containersRunning: 3,
      containersPaused: 1,
      containersStopped: 1,
      images: 12,
      dockerRootDir: "/var/lib/secretdocker",
      httpProxy: "http://secretproxy.corp:8080",
      httpsProxy: "https://secretproxy.corp:8443",
      name: "secret-docker-host",
    },
    dockerContainers: [
      {id: "c1", name: "arolariu-sql", state: "running", image: "mssql", mounts: [{Source: "/secret/mount/src"}]},
      {id: "c2", name: "arolariu-redis", state: "running", image: "redis"},
      {id: "c3", name: "unrelated-secret-container", state: "exited", image: "evil"},
    ],
    dockerImages: [{id: "img1"}, {id: "img2"}],
  };
}

/** Literals that must never survive projection into {@link HostFacts}. */
const SENSITIVE_LITERALS: readonly string[] = [
  "DESKTOP-SECRET01",
  "desktop-secret01.corp.local",
  "PC-SERIAL-99887766",
  "secretuser",
  "192.168.1.99",
  "10.20.30.40",
  "fe80::secretlink",
  "AA:BB:CC:DD:EE:FF",
  "11:22:33:44:55:66",
  "--secret-flag",
  "/secret/pg.conf",
  "PostgreSQL",
  "next dev",
  "PHYSICALDRIVE-SECRET",
  "SecretMountPoint",
  "/var/lib/secretdocker",
  "secretproxy.corp",
  "secret-docker-host",
  "/secret/mount/src",
  "unrelated-secret-container",
  "C:\\Users\\dev\\arolariu",
  "C:/Users/dev/arolariu",
  "c:\\users\\dev\\arolariu",
];

describe("projectSystemInformation - normalized facts", () => {
  it("projects OS, CPU, memory, load, and process counts as safe scalar facts", () => {
    const facts = projectSystemInformation(sensitiveHostValue(), baseInput());

    expect(facts.os).toEqual({platform: "win32", distro: "Microsoft Windows 11 Pro", release: "10.0.22631", arch: "x64"});
    expect(facts.cpu).toEqual({brand: "AMD Ryzen 9 5900X 12-Core", cores: 24, physicalCores: 12, virtualization: true});
    expect(facts.memory).toEqual({totalBytes: 68719476736, usedBytes: 20000000000, availableBytes: 48000000000});
    expect(facts.load).toEqual({currentLoadPercent: 17.25});
    expect(facts.processes).toEqual({all: 300, running: 5, blocked: 1});
  });

  it("projects only numeric filesystem facts and the repository-volume boolean", () => {
    const facts = projectSystemInformation(sensitiveHostValue(), baseInput());

    expect(facts.filesystems).toEqual([
      {sizeBytes: 1000000000000, usedBytes: 400000000000, availableBytes: 600000000000, usePercent: 40, repositoryVolume: true},
      {sizeBytes: 500000000000, usedBytes: 100000000000, availableBytes: 400000000000, usePercent: 20, repositoryVolume: false},
    ]);
  });

  it("derives the default interface operational state and non-negative latency without interface identity", () => {
    const facts = projectSystemInformation(sensitiveHostValue(), baseInput());

    expect(facts.network).toEqual({defaultInterfaceOperational: true, latencyMs: 14.5});
  });

  it("omits latency when it is absent, null, non-finite, or negative", () => {
    for (const inetLatency of [undefined, null, Number.POSITIVE_INFINITY, -5]) {
      const value = sensitiveHostValue();
      if (inetLatency === undefined) {
        delete value["inetLatency"];
      } else {
        value["inetLatency"] = inetLatency;
      }
      const facts = projectSystemInformation(value, baseInput());
      expect(facts.network.latencyMs).toBeUndefined();
      expect(facts.network.defaultInterfaceOperational).toBe(true);
    }
  });

  it("reports a non-operational default interface when its operstate is not up", () => {
    const value = sensitiveHostValue();
    (value["net"] as Array<Record<string, unknown>>)[0]!["operstate"] = "down";
    const facts = projectSystemInformation(value, baseInput());
    expect(facts.network.defaultInterfaceOperational).toBe(false);
  });
});

describe("projectSystemInformation - required ports", () => {
  it("matches only de-duplicated required TCP ports in listening state and correlates repository ownership", () => {
    const facts = projectSystemInformation(sensitiveHostValue(), baseInput({requiredPorts: [3000, 5432, 6379, 6379]}));

    expect(facts.requiredPorts).toEqual([
      {port: 3000, pid: 7777, processName: "node.exe", repositoryOwned: true},
      {port: 5432, pid: 4242, processName: "postgres.exe", repositoryOwned: false},
      {port: 6379, pid: 9999, processName: "redis-server", repositoryOwned: false},
    ]);
  });

  it("does not surface required ports that are not listening", () => {
    const facts = projectSystemInformation(sensitiveHostValue(), baseInput({requiredPorts: [8080]}));
    expect(facts.requiredPorts).toEqual([]);
  });

  it("throws on an out-of-range or non-integer required port without echoing it", () => {
    for (const port of [0, 70000, 1.5, -1]) {
      let message = "";
      try {
        projectSystemInformation(sensitiveHostValue(), baseInput({requiredPorts: [port]}));
      } catch (error: unknown) {
        message = error instanceof Error ? error.message : String(error);
      }
      expect(message).not.toBe("");
      expect(message).not.toContain(String(port));
    }
  });
});

describe("projectSystemInformation - repository volume selection", () => {
  it("marks only the most-specific mount containing the repository root for nested POSIX mounts", () => {
    const value = sensitiveHostValue();
    value["fsSize"] = [
      {fs: "/dev/sda1", type: "ext4", size: 100, used: 40, available: 60, use: 40, mount: "/"},
      {fs: "/dev/sda2", type: "ext4", size: 200, used: 50, available: 150, use: 25, mount: "/home"},
      {fs: "/dev/sda3", type: "ext4", size: 300, used: 60, available: 240, use: 20, mount: "/home/dev/repo"},
    ];
    const facts = projectSystemInformation(value, baseInput({repositoryRoot: "/home/dev/repo/packages"}));

    expect(facts.filesystems.map((entry) => entry.repositoryVolume)).toEqual([false, false, true]);
  });

  it("matches Windows-style mounts case-insensitively", () => {
    const value = sensitiveHostValue();
    value["fsSize"] = [{fs: "C:", type: "NTFS", size: 100, used: 40, available: 60, use: 40, mount: "c:\\users\\dev\\arolariu"}];
    const facts = projectSystemInformation(value, baseInput({repositoryRoot: "C:\\Users\\Dev\\Arolariu\\scripts"}));

    expect(facts.filesystems[0]?.repositoryVolume).toBe(true);
  });

  it("marks no repository volume when no mount contains the root", () => {
    const value = sensitiveHostValue();
    value["fsSize"] = [{fs: "E:", type: "NTFS", size: 100, used: 40, available: 60, use: 40, mount: "E:\\other"}];
    const facts = projectSystemInformation(value, baseInput());

    expect(facts.filesystems[0]?.repositoryVolume).toBe(false);
  });
});

describe("projectSystemInformation - containers", () => {
  it("reports unavailable containers with zero counts when no Docker aggregate is present", () => {
    const value = sensitiveHostValue();
    delete value["dockerInfo"];
    delete value["dockerContainers"];
    delete value["dockerImages"];
    const facts = projectSystemInformation(value, baseInput());

    expect(facts.containers).toEqual({available: false, total: 0, running: 0, paused: 0, stopped: 0, images: 0, repositoryContainers: []});
  });

  it("uses dockerInfo counts and filters repository containers to the approved, sorted, de-duplicated set", () => {
    const facts = projectSystemInformation(sensitiveHostValue(), baseInput());

    expect(facts.containers.available).toBe(true);
    expect(facts.containers.total).toBe(5);
    expect(facts.containers.running).toBe(3);
    expect(facts.containers.paused).toBe(1);
    expect(facts.containers.stopped).toBe(1);
    expect(facts.containers.images).toBe(12);
    expect(facts.containers.repositoryContainers).toEqual(["arolariu-redis", "arolariu-sql"]);
  });

  it("falls back to array lengths and state counts when dockerInfo is absent", () => {
    const value = sensitiveHostValue();
    delete value["dockerInfo"];
    const facts = projectSystemInformation(value, baseInput());

    expect(facts.containers.available).toBe(true);
    expect(facts.containers.total).toBe(3);
    expect(facts.containers.running).toBe(2);
    expect(facts.containers.paused).toBe(0);
    expect(facts.containers.stopped).toBe(1);
    expect(facts.containers.images).toBe(2);
  });

  it("throws when a present Docker aggregate is malformed", () => {
    const value = sensitiveHostValue();
    (value["dockerInfo"] as Record<string, unknown>)["containers"] = -3;
    expect(() => projectSystemInformation(value, baseInput())).toThrow();
  });
});

describe("projectSystemInformation - malformed host shapes", () => {
  it("throws when a required top-level structure is missing or malformed", () => {
    const cases: ReadonlyArray<(value: Record<string, unknown>) => void> = [
      (value) => delete value["os"],
      (value) => delete value["cpu"],
      (value) => delete value["mem"],
      (value) => delete value["currentLoad"],
      (value) => (value["fsSize"] = "not-an-array"),
      (value) => delete value["processes"],
      (value) => (value["networkConnections"] = "not-an-array"),
    ];
    for (const mutate of cases) {
      const value = sensitiveHostValue();
      mutate(value);
      expect(() => projectSystemInformation(value, baseInput())).toThrow();
    }
  });

  it("throws when a required numeric field is negative or non-integer where an integer is required", () => {
    const cases: ReadonlyArray<(value: Record<string, unknown>) => void> = [
      (value) => ((value["cpu"] as Record<string, unknown>)["cores"] = -1),
      (value) => ((value["cpu"] as Record<string, unknown>)["physicalCores"] = 2.5),
      (value) => ((value["mem"] as Record<string, unknown>)["total"] = "lots"),
      (value) => ((value["currentLoad"] as Record<string, unknown>)["currentLoad"] = -0.1),
      (value) => ((value["processes"] as Record<string, unknown>)["all"] = 1.5),
    ];
    for (const mutate of cases) {
      const value = sensitiveHostValue();
      mutate(value);
      expect(() => projectSystemInformation(value, baseInput())).toThrow();
    }
  });

  it("throws on an empty repository root and a non-object value", () => {
    expect(() => projectSystemInformation(sensitiveHostValue(), baseInput({repositoryRoot: "   "}))).toThrow();
    expect(() => projectSystemInformation("not-an-object", baseInput())).toThrow();
    expect(() => projectSystemInformation(null, baseInput())).toThrow();
  });
});

describe("projectSystemInformation - sensitive-field redaction", () => {
  it("omits every sensitive literal from the serialized HostFacts while preserving approved facts", () => {
    const facts: HostFacts = projectSystemInformation(sensitiveHostValue(), baseInput());
    const serialized = JSON.stringify(facts);

    for (const literal of SENSITIVE_LITERALS) {
      expect(serialized).not.toContain(literal);
    }

    expect(facts.os.release).toBe("10.0.22631");
    expect(facts.cpu.brand).toBe("AMD Ryzen 9 5900X 12-Core");
    expect(facts.containers.images).toBe(12);
    expect(facts.containers.total).toBe(5);
    expect(facts.containers.repositoryContainers).toEqual(["arolariu-redis", "arolariu-sql"]);
    expect(facts.requiredPorts.map((owner) => owner.port)).toEqual([3000, 5432, 6379]);
    expect(facts.requiredPorts.find((owner) => owner.port === 3000)?.repositoryOwned).toBe(true);
  });
});
