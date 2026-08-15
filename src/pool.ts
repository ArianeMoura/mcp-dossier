// Bounded concurrency for filesystem fan-out. Both callers walk a set sized by
// repository history, which is unbounded from the server's point of view, and
// an unbounded Promise.all over it exhausts file descriptors.
export async function forEachPooled<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;

  // Shared cursor, so a slow item doesn't stall the others.
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      if (item === undefined) return;
      await fn(item);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
}
