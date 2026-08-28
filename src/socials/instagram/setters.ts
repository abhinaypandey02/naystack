import { getInstagramContainerStatus } from "@/src/socials/instagram/getters";
import {
  InstagramPostInput,
  InstagramPostMedia,
} from "@/src/socials/instagram/types";
import { createPublisher } from "@/src/socials/meta/container";
import { readGraphID } from "@/src/socials/meta/request";
import { GraphParams } from "@/src/socials/meta/types";

import { getInstagramData } from "./utils";

const publisher = createPublisher({
  name: "Instagram",
  getStatus: getInstagramContainerStatus,
  createContainer: async (token, params) =>
    readGraphID(
      "Instagram media container",
      await getInstagramData<{ id: string }>(token, "me/media", {
        params,
        method: "POST",
      }),
    ),
  publish: async (token, creationID) =>
    readGraphID(
      "Instagram publish",
      await getInstagramData<{ id: string }>(token, "me/media_publish", {
        params: { creation_id: creationID },
        method: "POST",
      }),
    ),
});

const mediaParams = (media: InstagramPostMedia): GraphParams => ({
  media_type: media.type === "video" ? "VIDEO" : undefined,
  image_url: media.type === "image" ? media.url : undefined,
  video_url: media.type === "video" ? media.url : undefined,
  // Instagram accepts alt text on images only.
  alt_text: media.type === "image" ? media.altText : undefined,
});

/**
 * Publishes to Instagram — feed image, reel, story or carousel, chosen from the
 * media you pass. Creates the media container, waits for Instagram to finish
 * processing it, then publishes.
 *
 * Needs an access token with the `instagram_business_content_publish` scope and an
 * Instagram professional account. Media URLs must be publicly reachable (Instagram
 * downloads them server-side) and images must be JPEG. Instagram allows 100
 * published posts per rolling 24 hours.
 *
 * @param token - Instagram access token.
 * @param input - See {@link InstagramPostInput}.
 * @returns Promise of the published media id, or `null` if any step failed (the API's error is logged).
 *
 * @example
 * ```ts
 * import { createInstagramPost } from "naystack/socials";
 *
 * // Reel
 * await createInstagramPost(accessToken, {
 *   media: { url: "https://cdn.example.com/promo.mp4", type: "video" },
 *   caption: "Behind the scenes",
 *   shareToFeed: true,
 * });
 *
 * // Carousel
 * await createInstagramPost(accessToken, {
 *   caption: "Campaign recap",
 *   media: [
 *     { url: "https://cdn.example.com/1.jpg", type: "image" },
 *     { url: "https://cdn.example.com/2.mp4", type: "video" },
 *   ],
 * });
 * ```
 *
 * @category Socials
 */
export const createInstagramPost = async (
  token: string,
  input: InstagramPostInput,
) => {
  const media = [input.media].flat();
  const first = media[0];
  if (!first) {
    console.error(
      "[naystack] Instagram posts need at least one image or video",
    );
    return null;
  }

  if (input.story) {
    return publisher.publish(
      token,
      {
        ...mediaParams(first),
        media_type: "STORIES",
        alt_text: undefined,
      },
      input.wait,
    );
  }

  if (media.length > 1) {
    const children = await publisher.createChildren(
      token,
      media.map(mediaParams),
      input.wait,
    );
    if (!children) return null;
    return publisher.publish(
      token,
      {
        media_type: "CAROUSEL",
        children: children.join(","),
        caption: input.caption,
      },
      input.wait,
    );
  }

  if (first.type === "video") {
    return publisher.publish(
      token,
      {
        media_type: "REELS",
        video_url: first.url,
        caption: input.caption,
        cover_url: input.coverURL,
        thumb_offset: input.thumbOffset,
        share_to_feed: input.shareToFeed,
        audio_name: input.audioName,
        collaborators:
          input.collaborators && JSON.stringify(input.collaborators),
      },
      input.wait,
    );
  }

  return publisher.publish(
    token,
    {
      image_url: first.url,
      caption: input.caption,
      alt_text: first.altText,
      location_id: input.locationID,
    },
    input.wait,
  );
};

/**
 * Sends a text message to an Instagram user via the Instagram Messaging API.
 *
 * @param token - Instagram access token.
 * @param to - Recipient's Instagram user id.
 * @param text - Message text to send.
 * @returns Promise of `{ recipient_id, message_id }` on success.
 *
 * @example
 * ```ts
 * import { sendInstagramMessage } from "naystack/socials";
 *
 * const result = await sendInstagramMessage(accessToken, recipientId, "Hello!");
 * console.log("Sent message:", result?.message_id);
 * ```
 *
 * @category Socials
 */
export const sendInstagramMessage = (
  token: string,
  to: string,
  text: string,
) => {
  return getInstagramData<{
    recipient_id?: string;
    message_id?: string;
  }>(token, "me/messages", {
    body: {
      recipient: { id: to },
      message: {
        text,
      },
    },
  });
};
