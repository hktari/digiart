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
  const { total, marginal, rejected, printing, heldBack, perArtist, artists } =
    readiness;

  if (total === 0) return null;

  return (
    <div className="rounded-md border border-border bg-card p-4 text-sm">
      <p className="font-medium text-foreground">
        {printing} of {total} {total === 1 ? "piece" : "pieces"} will print
        {artists > 0 &&
          `, from ${artists} ${artists === 1 ? "artist" : "artists"}`}
        .
      </p>
      {(heldBack > 0 || marginal > 0 || rejected > 0) && (
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {heldBack > 0 && perArtist > 0 && (
            <li>
              {heldBack} more are print-ready but held back — we cap it at{" "}
              {perArtist} per artist so everyone you collected gets in.
            </li>
          )}
          {marginal > 0 && (
            <li>
              {marginal} would look soft at this size — posted below print
              resolution.
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
