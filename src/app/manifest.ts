import type { MetadataRoute } from "next";

/** Lets phones "Add to Home Screen" with the right name, icon and colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Underground Aquarium",
    short_name: "Underground Aq",
    description: "Free aquarium classifieds, care library, forums and the Underground Aquarium Society.",
    start_url: "/feed",
    display: "standalone",
    background_color: "#020b18",
    theme_color: "#020b18",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
