/**
 * Ownership helpers for the Phase 4 disposable Postgres container.
 * Unit-tested without Docker. The integration script must only `docker rm`
 * a container this process created (matching run id label).
 */

function createPhase4RunIdentity(pid, randomSuffix) {
  const runId = `${pid}-${randomSuffix}`;
  return {
    pid: String(pid),
    runId,
    containerName: `mobee-phase4-pg-${runId}`,
    labels: {
      "mobee.phase4.owner": String(pid),
      "mobee.phase4.run": runId,
    },
  };
}

function shouldRemoveOwnedContainer(inspect, ownedRunId) {
  if (!inspect || typeof inspect !== "object") {
    return false;
  }
  const labels = inspect.labels && typeof inspect.labels === "object" ? inspect.labels : null;
  if (!labels) {
    return false;
  }
  return labels["mobee.phase4.run"] === ownedRunId;
}

function dockerLabelArgs(labels) {
  const args = [];
  for (const [key, value] of Object.entries(labels)) {
    args.push("--label", `${key}=${value}`);
  }
  return args;
}

function parsePublishedPort(dockerPortStdout) {
  if (typeof dockerPortStdout !== "string") {
    return null;
  }
  const match = dockerPortStdout.match(/:(\d+)\s*$/m);
  if (!match) {
    return null;
  }
  return match[1];
}

function cleanupOwnedContainer(dockerRm, inspect, ownedRunId, containerId) {
  if (!containerId || !shouldRemoveOwnedContainer(inspect, ownedRunId)) {
    return { removed: false, containerId: null };
  }
  dockerRm(containerId);
  return { removed: true, containerId };
}

module.exports = {
  createPhase4RunIdentity,
  shouldRemoveOwnedContainer,
  dockerLabelArgs,
  parsePublishedPort,
  cleanupOwnedContainer,
};
