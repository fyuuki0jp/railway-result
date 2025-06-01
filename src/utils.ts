/**
 * Utility functions for working with Result types
 */

import type { Result } from './types.js';
import { ok, err } from './result.js';
import { isOk } from './guards.js';

/**
 * Converts a Promise<T> to Promise<Result<T, E>>
 * Catches any errors and wraps them in a Failure result
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fromPromise<T, E = any>(promise: Promise<T>): Promise<Result<T, E>> {
  try {
    const value = await promise;
    return ok(value);
  } catch (error) {
    return err(error as E);
  }
}

/**
 * Converts a Result<T, E> to Promise<T>
 * Throws the error if the result is a failure
 */
export function toPromise<T, E>(result: Result<T, E>): Promise<T> {
  if (isOk(result)) {
    return Promise.resolve(result.data);
  } else {
    return Promise.reject(result.error);
  }
}

/**
 * Maps over a Promise<Result<T, E>> with a synchronous function
 * Maintains Railway Oriented Programming pattern for async operations
 */
export async function mapPromiseResult<T, U, E>(
  promiseResult: Promise<Result<T, E>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (data: T) => U | Result<U, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Result<U, any>> {
  const result = await promiseResult;
  return result.map(fn);
}

/**
 * Maps over a Promise<Result<T, E>> with an asynchronous function
 * Maintains Railway Oriented Programming pattern for async operations
 */
export async function mapAsyncPromiseResult<T, U, E>(
  promiseResult: Promise<Result<T, E>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (data: T) => Promise<U> | Promise<Result<U, any>>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Result<U, any>> {
  const result = await promiseResult;
  return result.mapAsync(fn);
}
