import { Metadata } from "next";

import { EnvVariable, getEnv } from "@/src/env";

/**
 * Creates a metadata factory for Next.js pages. Call once with your site's default SEO config,
 * then call the returned function per-page to generate the `Metadata` object.
 *
 * The returned function supports page-specific `title`, `description`, and `image` overrides.
 * When a page title is provided, it's formatted as `"Page Title • Site Name"`.
 *
 * @param SEO - Base defaults for the whole site.
 * @param SEO.title - Default document title (used when no page-specific title is provided).
 * @param SEO.description - Default meta description.
 * @param SEO.siteName - Application/site name (used in openGraph, twitter, and as the separator in titles).
 * @param SEO.themeColor - Theme color for mobile browsers (e.g. `"#000000"`).
 * @returns A function `(title?, description?, image?, options?) => Metadata`. Pass page-specific overrides; they fill in or replace the defaults.
 *
 * @example Setup in a utility file:
 * ```ts
 * // lib/utils/seo.ts
 * import { setupSEO } from "naystack/client";
 *
 * export const getSEO = setupSEO({
 *   title: "Land Exchange Toolbox - Premium Real Estate Tools",
 *   description: "Empower your real estate business with advanced tools.",
 *   siteName: "Land Exchange Toolbox",
 *   themeColor: "#5b9364",
 * });
 * ```
 *
 * @example Usage in a page:
 * ```ts
 * // app/dashboard/page.tsx
 * import { getSEO } from "@/lib/utils/seo";
 *
 * export const metadata = getSEO("Dashboard", "Your personalized dashboard");
 * // => title: "Dashboard • Land Exchange Toolbox", description: "Your personalized dashboard"
 * ```
 *
 * @example Usage in generateMetadata:
 * ```ts
 * export async function generateMetadata({ params }) {
 *   const deal = await getDeal(params.id);
 *   return getSEO(deal.title, deal.description, deal.coverImage);
 * }
 * ```
 *
 * @example Thumbnail-sized preview (avatars, icons — anything not a hero image):
 * ```ts
 * return getSEO(post.title, post.body, post.author.photo, { imageSize: "small" });
 * ```
 *
 * @category Client
 */
export const setupSEO =
  (SEO: {
    title: string;
    description: string;
    siteName: string;
    themeColor: string;
  }) =>
  (
    title?: string,
    description?: string,
    image?: string | null,
    options?: SEOOptions,
  ): Metadata => {
    const isSmallImage = options?.imageSize === "small";
    return {
      title: title ? `${title} • ${SEO.siteName}` : SEO.title,
      description: description || SEO.description,
      openGraph: {
        type: "website",
        siteName: SEO.siteName,
        // WhatsApp/Slack pick the thumbnail layout off the declared dimensions,
        // so a small image needs them stated explicitly to avoid a full-bleed preview.
        ...(image
          ? {
              images: [
                isSmallImage
                  ? {
                      url: image,
                      width: SMALL_IMAGE_SIZE,
                      height: SMALL_IMAGE_SIZE,
                    }
                  : image,
              ],
            }
          : {}),
      },

      twitter: {
        card: isSmallImage ? "summary" : "summary_large_image",
        ...(image ? { images: [image] } : {}),
      },
      appleWebApp: {
        title: title ? title : SEO.title,
        capable: true,
        startupImage: `${getEnv(EnvVariable.NEXT_PUBLIC_BASE_URL)}/apple-icon.png`,
      },
      applicationName: SEO.siteName,
      creator: SEO.siteName,
      robots: "index, follow",
      publisher: SEO.siteName,
    };
  };

/** Below WhatsApp's ~300x200 threshold for promoting a preview to the large layout. */
const SMALL_IMAGE_SIZE = 200;

export interface SEOOptions {
  /**
   * `"large"` (default) renders a full-width hero preview; `"small"` renders a
   * square thumbnail next to the text — right for avatars and icons.
   */
  imageSize?: "large" | "small";
}
