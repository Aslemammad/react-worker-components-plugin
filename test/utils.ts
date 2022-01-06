export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function autoRetry(
  test: () => void | Promise<void>
): Promise<void> {
  const period = 100;
  const numberOfTries = 30_000 / period;
  let i = 0;
  while (true) {
    try {
      await test();
      return;
    } catch (err) {
      i = i + 1;
      if (i > numberOfTries) {
        throw err;
      }
    }
    await sleep(period);
  }
}
