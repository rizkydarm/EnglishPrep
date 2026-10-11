// Content validation entrypoint (T-001 stub).
// Task 2 will create src/lib/types/schema.ts; until then this exits 0 with a notice.
// NOTE: guarded dynamic import of ../src/lib/types/schema.js — static import would
// fail while Task 2 has not created the schema module yet.

const schemaPath = "../src/lib/types/schema.js";

let schema: unknown = null;
try {
  schema = await import(schemaPath);
} catch {
  console.log("[validate:content] schema not yet available (Task 2 pending) — nothing to validate, OK.");
  process.exit(0);
}

if (schema === null || typeof schema !== "object") {
  console.error("[validate:content] schema module loaded but is empty — FAIL.");
  process.exit(1);
}

console.log("[validate:content] schema module found — full validation lands with Task 3/5, OK.");
