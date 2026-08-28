import { ContainerState, GraphParams } from "@/src/socials/meta/types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Polling settings for a media container.
 *
 * @property intervalMS - Delay between status checks. Default: `5000`.
 * @property timeoutMS - Give up after this long. Default: `300000` (Meta stops processing after ~5 min).
 *
 * @category Socials
 */
export type WaitForContainerOptions = {
  intervalMS?: number;
  timeoutMS?: number;
};

/**
 * Retry settings for creating a media container.
 *
 * Meta intermittently rejects a perfectly valid container — most visibly on
 * carousels, where one arbitrary child fails with "Only photo or video can be
 * accepted as media type." and the identical call succeeds moments later. The
 * failure is transient and carries no distinguishing error code, so container
 * creation is simply retried rather than pattern-matched against Meta's copy.
 *
 * @property attempts - Total tries, including the first. Default: `3`.
 * @property backoffMS - Delay before the second try, doubled each time after. Default: `2000`.
 *
 * @category Socials
 */
export type RetryOptions = {
  attempts?: number;
  backoffMS?: number;
};

/**
 * Polls a media container until it stops processing.
 *
 * Resolves `null` when the platform never reported a readable status — that is
 * "unknown", not "failed", and the caller should go ahead and publish (text-only
 * containers are ready the moment they exist).
 */
async function waitForContainer(
  getState: () => Promise<ContainerState | null>,
  { intervalMS = 5000, timeoutMS = 300000 }: WaitForContainerOptions = {},
) {
  const deadline = Date.now() + timeoutMS;
  let state = await getState();
  if (!state) {
    await sleep(2000);
    return null;
  }
  while (state?.status === "IN_PROGRESS" && Date.now() < deadline) {
    await sleep(intervalMS);
    state = await getState();
  }
  return state;
}

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
    const state = await waitForContainer(
      () => platform.getStatus(token, id),
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
   * pair on failure. See {@link RetryOptions} for why.
   *
   * A permanent failure (bad token, missing scope, unreachable media) costs the
   * full attempt count and then gives up, which is cheap: a carousel abandons
   * on its first unusable child rather than working through the rest.
   */
  const createReady = async (
    token: string,
    params: GraphParams,
    label: string,
    wait?: WaitForContainerOptions,
    retry?: RetryOptions,
  ) => {
    const attempts = Math.max(1, retry?.attempts ?? 3);
    const backoffMS = retry?.backoffMS ?? 2000;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const id = await platform.createContainer(token, params);
      if (id && (await isReady(token, id, label, wait))) return id;
      if (attempt < attempts) {
        const delay = backoffMS * 2 ** (attempt - 1);
        console.warn(
          `[naystack] ${platform.name} ${label} attempt ${attempt}/${attempts} failed — retrying in ${delay}ms`,
        );
        await sleep(delay);
      }
    }
    return null;
  };

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

    /** Creates and awaits every carousel child, resolving to their ids — or `null` if any failed. */
    createChildren: async (
      token: string,
      items: GraphParams[],
      wait?: WaitForContainerOptions,
      retry?: RetryOptions,
    ) => {
      const children: string[] = [];
      for (const item of items) {
        const childID = await createReady(
          token,
          { ...item, is_carousel_item: true },
          "carousel item",
          wait,
          retry,
        );
        if (!childID) return null;
        children.push(childID);
      }
      return children;
    },
  };
}
