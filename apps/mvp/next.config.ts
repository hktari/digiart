import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "api.dicebear.com",
    pathname: "/**",
  },
  {
    protocol: "http",
    hostname: "localhost",
    port: "9000",
    pathname: "/**",
  },
];

// Add S3/MinIO storage endpoint for Next.js Image optimization
if (process.env.AWS_ENDPOINT_URL) {
  try {
    const endpointUrl = new URL(process.env.AWS_ENDPOINT_URL);
    remotePatterns.push({
      protocol: endpointUrl.protocol.slice(0, -1) as "http" | "https",
      hostname: endpointUrl.hostname,
      port: endpointUrl.port || undefined,
      pathname: "/**",
    });
  } catch {
    // Invalid endpoint URL, skip
  }
} else if (process.env.AWS_S3_BUCKET) {
  // AWS S3 virtual-hosted style URLs
  remotePatterns.push({
    protocol: "https",
    hostname: `${process.env.AWS_S3_BUCKET}.s3.amazonaws.com`,
    pathname: "/**",
  });
  if (process.env.AWS_REGION) {
    remotePatterns.push({
      protocol: "https",
      hostname: `${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`,
      pathname: "/**",
    });
  }
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://eu-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      {
        source: "/discover",
        destination: "/browse",
        permanent: true,
      },
      {
        source: "/discover/:path*",
        destination: "/browse",
        permanent: true,
      },
      {
        source: "/collector/discover",
        destination: "/browse",
        permanent: true,
      },
      {
        source: "/collector/discover/:path*",
        destination: "/browse",
        permanent: true,
      },
      {
        source: "/browse/creators",
        destination: "/browse?view=creators",
        permanent: true,
      },
      {
        source: "/browse/releases",
        destination: "/browse?view=releases",
        permanent: true,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production",
    remotePatterns,
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "btech-vr",

  project: "digiart-mvp",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
