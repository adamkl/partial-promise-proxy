/**
 * combines a partially defined object with a function that returns a promise of the rest of the partial object. Any properties defined in the initial partial object will be available immediately, while other properties will wait for the resolution of the promise 
 * 
 * @export
 * @template T 
 * @param {T} partialObject 
 * @param {() => Promise<T>} partialFunc 
 * @returns {*} 
 */
export function partialPromiseProxy<T extends object>(
  partialObject: T,
  partialFunc: () => Promise<T>
): any {
  let data: any = partialObject;

  let promise = (async () => {
    const promiseData = await partialFunc();
    Object.assign(data, promiseData);
  })();

  return new Proxy(data, {
    get: (target, key) => {
      if (key in partialObject) {
        return partialObject[key];
      }
      return promise.then(() => data[key]);
    }
  });
}
