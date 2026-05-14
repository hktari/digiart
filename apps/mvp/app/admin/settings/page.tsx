import {
  getPlatformConfig,
  updatePlatformConfig,
} from "@/lib/actions/platform-config-actions";
import { requireAdmin } from "@/lib/roles";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();

  const config = await getPlatformConfig();
  const { error, success } = await searchParams;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage global platform configuration values
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive-bg border border-destructive-border p-4 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-success-bg border border-success-border p-4 text-sm text-success-foreground">
          Settings saved successfully.
        </div>
      )}

      <div className="bg-card border rounded-lg p-6 space-y-6">
        <h2 className="text-xl font-semibold">POD Pricing</h2>
        <form action={updatePlatformConfig} className="space-y-4">
          <div>
            <label
              htmlFor="quoteMarginAmount"
              className="block text-sm font-medium text-foreground"
            >
              Quote Margin Rate
            </label>
            <p className="text-xs text-muted-foreground mb-1">
              Fractional margin added to Peecho wholesale quotes (e.g. 0.3 =
              30%). Must match the margin configured in the Peecho merchant
              dashboard.
            </p>
            <input
              type="number"
              id="quoteMarginAmount"
              name="quoteMarginAmount"
              step="0.01"
              min="0"
              max="1"
              defaultValue={config?.quoteMarginAmount ?? 0.3}
              required
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="creatorPayoutSplit"
                className="block text-sm font-medium text-foreground"
              >
                Creator Payout Split
              </label>
              <p className="text-xs text-muted-foreground mb-1">
                Fraction of markup paid to creators (e.g. 0.7 = 70%)
              </p>
              <input
                type="number"
                id="creatorPayoutSplit"
                name="creatorPayoutSplit"
                step="0.01"
                min="0"
                max="1"
                defaultValue={config?.creatorPayoutSplit ?? 0.7}
                required
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label
                htmlFor="platformFeeSplit"
                className="block text-sm font-medium text-foreground"
              >
                Platform Fee Split
              </label>
              <p className="text-xs text-muted-foreground mb-1">
                Fraction of markup kept as platform fee (e.g. 0.3 = 30%)
              </p>
              <input
                type="number"
                id="platformFeeSplit"
                name="platformFeeSplit"
                step="0.01"
                min="0"
                max="1"
                defaultValue={config?.platformFeeSplit ?? 0.3}
                required
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="maxArtworksPerRelease"
                className="block text-sm font-medium text-foreground"
              >
                Max Artworks per Release
              </label>
              <input
                type="number"
                id="maxArtworksPerRelease"
                name="maxArtworksPerRelease"
                min="1"
                defaultValue={config?.maxArtworksPerRelease ?? 20}
                required
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label
                htmlFor="maxReleasesPerCycle"
                className="block text-sm font-medium text-foreground"
              >
                Max Releases per Cycle
              </label>
              <input
                type="number"
                id="maxReleasesPerCycle"
                name="maxReleasesPerCycle"
                min="1"
                defaultValue={config?.maxReleasesPerCycle ?? 3}
                required
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>

      <div className="bg-warning-bg border border-warning-border rounded-lg p-4 text-sm text-warning-foreground">
        <p className="font-medium mb-1">
          Important: Keep Peecho margin in sync
        </p>
        <p className="text-xs">
          The Quote Margin Rate here must match the margin configured in your
          Peecho merchant dashboard. If they differ, collectors will see
          incorrect price estimates before checkout.
        </p>
      </div>
    </div>
  );
}
