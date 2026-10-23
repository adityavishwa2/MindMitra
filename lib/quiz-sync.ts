export type CachedAnswer = {
  selected: number | null;
  selectedOptions?: number[];
  reviewed: boolean;
  text?: string;
};

/** One shared drain: submit waits for in-flight saves and edits made during them. */
export function pendingDrain<T>(
  pending: () => Record<string, T>,
  save: (id: string, value: T) => Promise<unknown>,
) {
  let flight: Promise<void> | undefined;
  return () => {
    if (flight) return flight;
    flight = (async () => {
      while (Object.keys(pending()).length) {
        for (const [id, value] of Object.entries(pending())) {
          await save(id, value);
          // A newer edit must never be removed by an older response.
          if (pending()[id] === value) delete pending()[id];
        }
      }
    })().finally(() => {
      flight = undefined;
    });
    return flight;
  };
}

export function readCachedAnswers(
  raw: string | null,
  questions: { id: string; type: string; options: string[] }[],
): Record<string, CachedAnswer> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw ?? "{}");
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const result: Record<string, CachedAnswer> = {};
  for (const q of questions) {
    if (!Object.hasOwn(parsed, q.id)) continue;
    const a = (parsed as Record<string, unknown>)[q.id];
    if (!a || typeof a !== "object") continue;
    const value = a as CachedAnswer;
    const validIndex = (i: unknown) =>
      typeof i === "number" &&
      Number.isInteger(i) &&
      i >= 0 &&
      i < q.options.length;
    if (
      typeof value.reviewed !== "boolean" ||
      (value.text !== undefined &&
        (typeof value.text !== "string" || value.text.length > 20000)) ||
      (value.selected !== null && !validIndex(value.selected)) ||
      (value.selectedOptions !== undefined &&
        (!Array.isArray(value.selectedOptions) ||
          value.selectedOptions.some((i) => !validIndex(i)) ||
          new Set(value.selectedOptions).size !== value.selectedOptions.length))
    )
      continue;
    if (
      q.type === "MSQ"
        ? value.selected !== null
        : !!value.selectedOptions?.length
    )
      continue;
    if (q.type === "DESCRIPTIVE" ? value.selected !== null : !!value.text)
      continue;
    result[q.id] = {
      selected: value.selected,
      selectedOptions: value.selectedOptions ?? [],
      reviewed: value.reviewed,
      text: value.text ?? "",
    };
  }
  return result;
}
