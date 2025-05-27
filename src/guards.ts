/**
 * Type guard functions for Result types
 */

import type { Result, Success, Failure } from './types';

/**
 * Type guard to check if a Result is a Success
 */
export function isOk<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success;
}

/**
 * Type guard to check if a Result is a Failure
 */
export function isErr<T, E>(result: Result<T, E>): result is Failure<E> {
  return !result.success;
}
