export function parseGuestId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const guestId = value.trim();
  return guestId.length > 0 ? guestId : undefined;
}