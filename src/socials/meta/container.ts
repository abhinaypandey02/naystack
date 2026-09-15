import { ContainerState, GraphParams } from "@/src/socials/meta/types";
import {
  PollOptions,
  pollUntilReady,
  RetryOptions,
  withRetry,
} from "@/src/socials/utils/poll";

export type { RetryOptions };

/**
 * Polling settings for a media container. The default timeout matches Meta,
 * which stops processing after ~5 min.
 *
 * @category Socials
 */
export type WaitForContainerOptions = PollOptions;

/**
 * Wires up the create → wait → publish flow Meta platforms share. Instagram and
 * Threads differ only in their endpoints, so each builds one publisher and every
 * post shape goes through it.
 *
 * @param platform.name - Used in error logs, e.g. `"Instagram"`.
 * @param platform.createContainer - Creates a container, resolving to its id.
 * @param platform.getStatus - Reads a container's state by id.
 * @param platform.publish - Publishes a finished container, resolving to the post id.
 * @returns `{ publish, createChildren }`.
 */
export function createPublisher(platform: {
  name: string;
  createContainer: (
    token: string,
    params: GraphParams,
  ) => Promise<string | null>;
  getStatus: (token: string, id: string) => Promise<ContainerState | null>;
  publish: (token: string, creationID: string) => Promise<string | null>;
}) {
  const isReady = async (
    token: string,
    id: string,
    label: string,
    wait?: WaitForContainerOptions,
  ) => {
    // A null state is "unknown", not "failed" — text-only containers are ready
    // the moment they exist and never report a readable status, so publish anyway.
    const state = await pollUntilReady(
      () => platform.getStatus(token, id),
      (current) => current.status === "IN_PROGRESS",
      wait,
    );
    if (state && state.status !== "FINISHED" && state.status !== "PUBLISHED") {
      console.error(
        `[naystack] ${platform.name} ${label} ${id} is ${state.status}${
          state.error ? `: ${state.error}` : ""
        }`,
      );
      return false;
    }
    return true;
  };

  /**
   * Creates a container and waits for it to finish processing, retrying the
   * pair on failure.
   *
   * Meta intermittently rejects a perfectly valid container — most visibly on
   * carousels, where one arbitrary child fails with "Only photo or video can be
   * accepted as media type." and the identical call succeeds moments later. The
   * failure is transient and carries no distinguishing error code, so container
   * creation is simply retried rather than pattern-matched against Meta's copy.
   *
   * A permanent failure (bad token, missing scope, unreachable media) costs the
   * full attempt count and then gives up, which is cheap: a carousel abandons
   * on its first unusable child rather than working through the rest.
   */
  const createReady = (
    token: string,
    params: GraphParams,
    label: string,
    wait?: WaitForContainerOptions,
    retry?: RetryOptions,
  ) =>
    withRetry(
      async () => {
        const id = await platform.createContainer(token, params);
        if (!id || !(await isReady(token, id, label, wait))) return null;
        return id;
      },
      {
        ...retry,
        onRetry: (attempt, attempts, delayMS) => {
          console.warn(
            `[naystack] ${platform.name} ${label} attempt ${attempt}/${attempts} failed — retrying in ${delayMS}ms`,
          );
        },
      },
    );

  return {
    /** Creates a container, waits for it to finish processing, then publishes it. */
    publish: async (
      token: string,
      params: GraphParams,
      wait?: WaitForContainerOptions,
      retry?: RetryOptions,
    ) => {
      const containerID = await createReady(
        token,
        params,
        "container",
        wait,
        retry,
      );
      if (!containerID) return null;
      // Deliberately not retried: a publish whose response was lost has still
      // published, and trying again would post twice.
      return platform.publish(token, containerID);
    },

    /**
     * Creates and awaits every carousel child **in parallel**, resolving to
     * their ids in input order — or `null` if any failed.
     *
     * Parallel because each child is an independent create-then-poll and Meta
     * spends ~5s accepting a single container, so ten sequential children cost
     * ~50s of mostly waiting — past what a serverless caller can fit in its
     * timeout. `Promise.all` preserves input order, which the carousel's slide
     * order depends on.
     */
    createChildren: async (
      token: string,
      items: GraphParams[],
      wait?: WaitForContainerOptions,
      retry?: RetryOptions,
    ) => {
      const children = await Promise.all(
        items.map((item) =>
          createReady(
            token,
            { ...item, is_carousel_item: true },
            "carousel item",
            wait,
            retry,
          ),
        ),
      );
      // Every child must land: a missing one silently reorders the carousel
      // against its caption. Unlike the sequential version this no longer
      // short-circuits on the first failure — the rest are already in flight.
      const created = children.filter((childID) => childID !== null);
      return created.length === children.length ? created : null;
    },
  };
}
