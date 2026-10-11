export interface IdRef {
  id: string;
  source: string;
}

export interface DuplicateId {
  id: string;
  sources: string[];
}

/**
 * Finds ids that appear more than once across the given references.
 * Content ids must be globally unique so a collision in a custom pack
 * cannot silently shadow a built-in entry.
 */
export function findDuplicateIds(refs: IdRef[]): DuplicateId[] {
  const byId = new Map<string, string[]>();
  for (const { id, source } of refs) {
    const list = byId.get(id);
    if (list === undefined) byId.set(id, [source]);
    else list.push(source);
  }
  const duplicates: DuplicateId[] = [];
  for (const [id, sources] of byId) {
    if (sources.length > 1) duplicates.push({ id, sources });
  }
  return duplicates.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function formatDuplicate(d: DuplicateId): string {
  return `duplicate id "${d.id}" appears ${d.sources.length} times: ${d.sources.join(", ")}`;
}
