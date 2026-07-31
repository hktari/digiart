import type { CollectionReadiness } from "@/lib/collect/print-service";

/**
 * What will actually reach paper, shown before the collector commits.
 *
 * The tiered floor is only honest if it is visible: printing 20 of 31 artists
 * and saying nothing would read as "we printed your collection".
 */
export function PrintReadiness({
  readiness,
}: {
  readiness: CollectionReadiness;
}) {
  const { total, ok, marginal, rejected } = readiness;
  const printable = ok + marginal;

  if (total === 0) return null;

  return (
    <div className="rounded-md border border-border bg-card p-4 text-sm">
      <p className="font-medium text-foreground">
        {printable} of {total} {total === 1 ? "piece" : "pieces"} will print.
      </p>
      {(marginal > 0 || rejected > 0) && (
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {marginal > 0 && (
            <li>
              {marginal} {marginal === 1 ? "will" : "will"} look soft at this
              size — {marginal === 1 ? "it was" : "they were"} posted below
              print resolution.
            </li>
          )}
          {rejected > 0 && (
            <li>
              {rejected} can&apos;t be printed at the resolution the artist
              posted.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
