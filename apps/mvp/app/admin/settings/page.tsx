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
        <p className="text-gray-600 mt-1">
          Manage global platform configuration values
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          Settings saved successfully.
        </div>
      )}

      <div className="bg-white border border-beige-200 rounded-lg p-6 space-y-6">
        <h2 className="text-xl font-semibold">POD Pricing</h2>
        <form action={updatePlatformConfig} className="space-y-4">
          <div>
            <label
              htmlFor="quoteMarginAmount"
              className="block text-sm font-medium text-gray-700"
            >
              Quote Margin Rate
            </label>
            <p className="text-xs text-gray-500 mb-1">
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="creatorPayoutSplit"
                className="block text-sm font-medium text-gray-700"
              >
                Creator Payout Split
              </label>
              <p className="text-xs text-gray-500 mb-1">
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
              />
            </div>

            <div>
              <label
                htmlFor="platformFeeSplit"
                className="block text-sm font-medium text-gray-700"
              >
                Platform Fee Split
              </label>
              <p className="text-xs text-gray-500 mb-1">
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="maxArtworksPerRelease"
                className="block text-sm font-medium text-gray-700"
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
              />
            </div>

            <div>
              <label
                htmlFor="maxReleasesPerCycle"
                className="block text-sm font-medium text-gray-700"
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
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-fuchsia-600 text-white text-sm font-medium rounded-md hover:bg-fuchsia-700 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
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
