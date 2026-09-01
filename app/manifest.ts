import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EduResults - Student Result Portal",
    short_name: "EduResults",
    description: "Secure, transparent academic result and student record management.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#1B2B4B",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
