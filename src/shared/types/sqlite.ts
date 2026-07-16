// Supported better-sqlite3 bindings: readonly arrays for positional `?` values,
// or records for named `@param` values.
export type BindParameters = readonly unknown[] | Record<string, unknown>;
