import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eduresults-portal.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/parent/login",
          "/teacher/login",
          "/admin/login",
        ],
        disallow: [
          "/api/",
          "/admin/",
          "/teacher/",
          "/parent/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
