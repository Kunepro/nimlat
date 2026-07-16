// Compatibility barrel for architecture boundary tests.
// Keep scanner implementations in focused files so guardrail code stays as maintainable as app code.

export * from "./architecture-path-utils";
export * from "./architecture-module-scanners";
export * from "./architecture-facade-scanners";
export * from "./architecture-ipc-scanners";
