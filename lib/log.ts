/** Structured one-line JSON logs for Vercel / local stdout. */

export function logEvent(
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...fields,
  });
  if (fields.level === "error") {
    console.error(line);
  } else if (fields.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}
