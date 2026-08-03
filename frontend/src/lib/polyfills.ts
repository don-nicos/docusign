// Polyfill for Promise.withResolvers (not available in Node.js < 22)
// This must run before any pdfjs-dist imports
type WithResolversResult<T> = {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

if (typeof globalThis !== 'undefined') {
  const promiseCtor = globalThis.Promise as unknown as {
    withResolvers?: <T>() => WithResolversResult<T>
  }

  if (typeof globalThis.Promise !== 'undefined' && 
      typeof promiseCtor.withResolvers === 'undefined') {
    promiseCtor.withResolvers = function <T>() {
      let resolve: (value: T | PromiseLike<T>) => void
      let reject: (reason?: unknown) => void
      const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
      })
      return { promise, resolve: resolve!, reject: reject! }
    }
  }
}

// Also apply to global Promise in case globalThis is not available
const globalPromiseCtor = Promise as unknown as {
  withResolvers?: <T>() => WithResolversResult<T>
}

if (typeof Promise !== 'undefined' && typeof globalPromiseCtor.withResolvers === 'undefined') {
  globalPromiseCtor.withResolvers = function <T>() {
    let resolve: (value: T | PromiseLike<T>) => void
    let reject: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve: resolve!, reject: reject! }
  }
}

export {}
