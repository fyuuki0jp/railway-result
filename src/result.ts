/**
 * Result creation functions and implementations
 */

import type { Result, Success, Failure } from './types.js';

/**
 * Creates a success result with chainable methods
 */
export function ok<T>(value: T): Success<T> {
  return new SuccessImpl(value);
}

/**
 * Creates a failure result with chainable methods
 */
export function err<E>(error: E): Failure<E> {
  return new FailureImpl(error);
}

/**
 * Implementation of Success with chainable methods
 */
class SuccessImpl<T> implements Success<T> {
  readonly success = true as const;

  constructor(readonly data: T) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async map<U>(fn: (data: T) => U | Result<U, any> | Promise<U> | Promise<Result<U, any>>): Promise<Result<U, any>> {
    try {
      const result = fn(this.data);

      // If the function returns a Promise, await it
      if (result && typeof result === 'object' && 'then' in result) {
        const awaitedResult = await result;
        // If the awaited result is a Result, return it directly
        if (awaitedResult && typeof awaitedResult === 'object' && 'success' in awaitedResult) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return awaitedResult as Result<U, any>;
        }
        // Otherwise, wrap the value in a success Result
        return ok(awaitedResult as U);
      }

      // If the function returns a Result, return it directly
      if (result && typeof result === 'object' && 'success' in result) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return result as Result<U, any>;
      }

      // Otherwise, wrap the value in a success Result
      return ok(result as U);
    } catch (error) {
      return err(error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapAsync<U>(fn: (data: T) => Promise<U> | Promise<Result<U, any>>): Promise<Result<U, any>> {
    return this.map(fn);
  }
}

/**
 * Implementation of Failure with chainable methods
 */
class FailureImpl<E> implements Failure<E> {
  readonly success = false as const;

  constructor(readonly error: E) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  async map<U>(_fn: (data: never) => U | Result<U, any> | Promise<U> | Promise<Result<U, any>>): Promise<Result<U, any>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this as any;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  mapAsync<U>(_fn: (data: never) => Promise<U> | Promise<Result<U, any>>): Promise<Result<U, any>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this as any;
  }
}
