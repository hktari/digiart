import { getClient } from "@umami/api-client";

export type UmamiClientOptions = {
  apiKey?: string;
  endpoint?: string;
};

export function createUmamiClient(options: UmamiClientOptions = {}) {
  if (options.apiKey) {
    process.env.UMAMI_API_KEY = options.apiKey;
  }

  if (options.endpoint) {
    process.env.UMAMI_API_CLIENT_ENDPOINT = options.endpoint;
  }

  if (!process.env.UMAMI_API_KEY) {
    throw new Error("UMAMI_API_KEY is required to create an Umami client.");
  }

  if (!process.env.UMAMI_API_CLIENT_ENDPOINT) {
    throw new Error(
      "UMAMI_API_CLIENT_ENDPOINT is required to create an Umami client."
    );
  }

  return getClient();
}
