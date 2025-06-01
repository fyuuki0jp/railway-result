/**
 * Railway Result - TypeScript Result type implementation for Railway Oriented Programming
 * 
 * This library provides a Result type that represents either a success value or an error,
 * enabling Railway Oriented Programming patterns for better error handling.
 */

// Core Result types
export type { Result } from './types.js';
export type { Success, Failure } from './types.js';

// Result creation functions
export { ok, err } from './result.js';

// Type guards
export { isOk, isErr } from './guards.js';

// Utility functions
export { fromPromise, toPromise } from './utils.js';
export { mapPromiseResult, mapAsyncPromiseResult } from './utils.js';

// Do notation and chaining
export { Do } from './do-notation.js';
export { ResultChain } from './do-notation.js';

// Zod integration helpers
export { zodToResult } from './zod-helpers.js';
