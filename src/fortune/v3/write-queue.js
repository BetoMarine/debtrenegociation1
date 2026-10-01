/** Serializes Fortune saves so a wipe is never followed by an older write. */
export function createWriteQueue() {
  let chain = Promise.resolve();
  let epoch = 0;
  return {
    beforeWrite: null,
    get epoch() {
      return epoch;
    },
    bump() {
      epoch += 1;
    },
    enqueue(task) {
      const run = chain.then(task, task);
      chain = run.then(
        () => {},
        () => {},
      );
      return run;
    },
  };
}
