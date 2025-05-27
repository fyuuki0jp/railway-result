/**
 * Core Result type definitions
 */

/**
 * A Result type representing either a success value or an error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Result<T, E = any> = Success<T> | Failure<E>;

/**
 * Success case of Result with chainable methods
 */
export interface Success<T> {
  readonly success: true;
  readonly data: T;

  // Core Railway Oriented Programming method with Promise support
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map<U>(fn: (data: T) => U | Result<U, any> | Promise<U> | Promise<Result<U, any>>): Promise<Result<U, any>>;

  // Alias for map method for backward compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapAsync<U>(fn: (data: T) => Promise<U> | Promise<Result<U, any>>): Promise<Result<U, any>>;
}

/**
 * Failure case of Result with chainable methods
 */
export interface Failure<E> {
  readonly success: false;
  readonly error: E;

  // Core Railway Oriented Programming method with Promise support
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map<U>(fn: (data: never) => U | Result<U, any> | Promise<U> | Promise<Result<U, any>>): Promise<Result<U, any>>;

  // Alias for map method for backward compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapAsync<U>(fn: (data: never) => Promise<U> | Promise<Result<U, any>>): Promise<Result<U, any>>;
}
