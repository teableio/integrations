// handleErrors (see src/index.ts) turns a failed Teable response into
// z.errors.Error, whose constructor JSON-stringifies { message, code, status }
// into the Error's own message. This reads that status back out so a caller can
// react to one specific failure without repeating the request.
const statusOf = (error: unknown): number | undefined => {
  if (!(error instanceof Error)) return undefined;
  try {
    const parsed = JSON.parse(error.message) as { status?: unknown };
    return typeof parsed.status === 'number' ? parsed.status : undefined;
  } catch {
    // Anything not produced by z.errors.Error — a network failure, a bug in our
    // own code — has a plain-text message and simply has no status.
    return undefined;
  }
};

export { statusOf };
