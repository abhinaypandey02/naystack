import { Metadata } from "next";

export const setupSEO =
  (SEO: {
    title: string;
    description: string;
    siteName: string;
    themeColor: string;
  }) =>
  (title?: string, description?: string, image?: string | null): Metadata => ({
    title: title ? `${title} • ${SEO.siteName}` : SEO.title,
    description: description || SEO.description,
    openGraph: {
      type: "website",
      siteName: SEO.siteName,
      ...(image ? { images: [image] } : {}),
    },

    twitter: {
      card: "summary_large_image",
      ...(image ? { images: [image] } : {}),
    },
    appleWebApp: {
      title: title ? title : SEO.title,
      capable: true,
      startupImage: `${process.env.NEXT_PUBLIC_BASE_URL}/apple-icon.png`,
    },
    applicationName: SEO.siteName,
    creator: SEO.siteName,
    robots: "index, follow",
    publisher: SEO.siteName,
  });
