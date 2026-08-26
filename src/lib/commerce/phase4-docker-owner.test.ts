import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const require = createRequire(import.meta.url);
const owner = require("../../../scripts/phase4-docker-owner.cjs") as {
  createPhase4RunIdentity: (
    pid: number,
    randomSuffix: string,
  ) => {
    pid: string;
    runId: string;
    containerName: string;
    labels: Record<string, string>;
  };
  shouldRemoveOwnedContainer: (
    inspect: { labels?: Record<string, string> } | null,
    ownedRunId: string,
  ) => boolean;
  cleanupOwnedContainer: (
    dockerRm: (id: string) => void,
    inspect: { labels?: Record<string, string> } | null,
    ownedRunId: string,
    containerId: string | null,
  ) => { removed: boolean; containerId: string | null };
  parsePublishedPort: (stdout: string) => string | null;
};

describe("Phase 4 Docker container ownership", () => {
  it("builds a unique name per pid and run", () => {
    const identity = owner.createPhase4RunIdentity(4242, "ab12cd");
    expect(identity.containerName).toBe("mobee-phase4-pg-4242-ab12cd");
    expect(identity.labels["mobee.phase4.owner"]).toBe("4242");
    expect(identity.labels["mobee.phase4.run"]).toBe("4242-ab12cd");
  });

  it("does not remove a container without this run label", () => {
    expect(owner.shouldRemoveOwnedContainer({ labels: {} }, "4242-ab12cd")).toBe(false);
    expect(
      owner.shouldRemoveOwnedContainer(
        { labels: { "mobee.phase4.run": "other-run" } },
        "4242-ab12cd",
      ),
    ).toBe(false);
    expect(owner.shouldRemoveOwnedContainer(null, "4242-ab12cd")).toBe(false);
  });

  it("cleanup of a foreign name or missing label is a no-op", () => {
    const dockerRm = vi.fn();
    const result = owner.cleanupOwnedContainer(
      dockerRm,
      { labels: { "mobee.phase4.run": "foreign" } },
      "4242-ab12cd",
      "abc123foreign",
    );
    expect(result.removed).toBe(false);
    expect(dockerRm).not.toHaveBeenCalled();
  });

  it("cleanup of this process container removes only that id", () => {
    const dockerRm = vi.fn();
    const result = owner.cleanupOwnedContainer(
      dockerRm,
      { labels: { "mobee.phase4.owner": "4242", "mobee.phase4.run": "4242-ab12cd" } },
      "4242-ab12cd",
      "deadbeefcafebabe",
    );
    expect(result).toEqual({ removed: true, containerId: "deadbeefcafebabe" });
    expect(dockerRm).toHaveBeenCalledTimes(1);
    expect(dockerRm).toHaveBeenCalledWith("deadbeefcafebabe");
  });

  it("parses the published host port without credentials", () => {
    expect(owner.parsePublishedPort("127.0.0.1:55432")).toBe("55432");
    expect(owner.parsePublishedPort("0.0.0.0:60123\n")).toBe("60123");
  });
});
