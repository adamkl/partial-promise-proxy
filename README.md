# partial-promise-proxy

Combines a partially defined object with a function that returns a promise of the rest of the partial object. Any properties defined in the initial partial object will be available immediately, while other properties will wait for the resolution of the promise.
