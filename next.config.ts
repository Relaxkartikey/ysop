import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    skipWaiting: true,
    // Never let the app shell serve a stale Server Action/page for authenticated routes.
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
        handler: "NetworkOnly",
      },
      {
        urlPattern: ({ request }) => request.destination === "document",
        handler: "NetworkFirst",
        options: { cacheName: "ysop-pages", networkTimeoutSeconds: 3 },
      },
      {
        urlPattern: ({ request }) =>
          ["style", "script", "image", "font"].includes(request.destination),
        handler: "StaleWhileRevalidate",
        options: { cacheName: "ysop-static-assets" },
      },
    ],
  },
});

const nextConfig: NextConfig = {};

export default withPWA(nextConfig);
