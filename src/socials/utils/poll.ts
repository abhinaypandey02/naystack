/**
 * Waiting and retrying, with no platform in them. Meta's media containers were
 * the first caller; any API that hands back a job id and a status endpoint wants
 * the same two helpers.
 *
 * @module
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Polling settings for {@link pollUntilReady}.
 *
 * @property intervalMS - Delay between reads. Default: `5000`.
 * @property timeoutMS - Stop polling after this long. Default: `300000`.
 *
 * @category Socials
 */
export type PollOptions = {
  intervalMS?: number;
  timeoutMS?: number;
};

/**
 * Retry settings for {@link withRetry}.
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
 * Reads a job's state until it stops being pending.
 *
 * Resolves `null` when the first read returns nothing. That is "unknown", not
 * "failed": some jobs are complete the moment they exist and never publish a
 * readable status, so treating `null` as an error would reject work that already
 * succeeded. A short pause before returning gives such a job a beat to settle.
 *
 * @param read - `null` means no state was readable.
 * @param isPending - `true` while the state means "still working".
 * @returns The last state read, or `null` if the state was never readable.
 *
 * @example
 * ```ts
 * import { pollUntilReady } from "naystack/socials";
 *
 * const state = await pollUntilReady(
 *   () => getInstagramContainerStatus(token, containerID),
 *   (s) => s.status === "IN_PROGRESS",
 * );
 * ```
 *
 * @category Socials
 */
export async function pollUntilReady<T>(
  read: () => Promise<T | null>,
  isPending: (state: T) => boolean,
  { intervalMS = 5000, timeoutMS = 300000 }: PollOptions = {},
): Promise<T | null> {
  const deadline = Date.now() + timeoutMS;
  let state = await read();
  if (!state) {
    await sleep(2000);
    return null;
  }
  while (state && isPending(state) && Date.now() < deadline) {
    await sleep(intervalMS);
    state = await read();
  }
  return state;
}

/**
 * Runs an operation until it produces a result, backing off between tries.
 *
 * `run` signals failure by resolving `null` rather than throwing — the socials
 * helpers log the API's message and resolve `null`, so a loop that only caught
 * exceptions would never retry.
 *
 * @param run - Receives the 1-based attempt number; resolve `null` to retry.
 * @param options - {@link RetryOptions}, plus `onRetry` for logging before each delay.
 * @returns The first non-`null` result, or `null` once every attempt is spent.
 *
 * @example
 * ```ts
 * import { withRetry } from "naystack/socials";
 *
 * const id = await withRetry(() => createContainer(token, params), {
 *   attempts: 3,
 *   onRetry: (attempt, attempts, delayMS) =>
 *     console.warn(`attempt ${attempt}/${attempts} failed — retrying in ${delayMS}ms`),
 * });
 * ```
 *
 * @category Socials
 */
export async function withRetry<T>(
  run: (attempt: number) => Promise<T | null>,
  options: RetryOptions & {
    onRetry?: (attempt: number, attempts: number, delayMS: number) => void;
  } = {},
): Promise<T | null> {
  const attempts = Math.max(1, options.attempts ?? 3);
  const backoffMS = options.backoffMS ?? 2000;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = await run(attempt);
    if (result) return result;
    if (attempt < attempts) {
      const delayMS = backoffMS * 2 ** (attempt - 1);
      options.onRetry?.(attempt, attempts, delayMS);
      await sleep(delayMS);
    }
  }
  return null;
}
