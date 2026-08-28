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

  return {
    /** Creates a container, waits for it to finish processing, then publishes it. */
    publish: async (
      token: string,
      params: GraphParams,
      wait?: WaitForContainerOptions,
    ) => {
      const containerID = await platform.createContainer(token, params);
      if (!containerID) return null;
      if (!(await isReady(token, containerID, "container", wait))) return null;
      return platform.publish(token, containerID);
    },

    /** Creates and awaits every carousel child, resolving to their ids — or `null` if any failed. */
    createChildren: async (
      token: string,
      items: GraphParams[],
      wait?: WaitForContainerOptions,
    ) => {
      const children: string[] = [];
      for (const item of items) {
        const childID = await platform.createContainer(token, {
          ...item,
          is_carousel_item: true,
        });
        if (!childID) return null;
        if (!(await isReady(token, childID, "carousel item", wait)))
          return null;
        children.push(childID);
      }
      return children;
    },
  };
}
