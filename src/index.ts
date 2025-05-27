/**
 * Railway Result - TypeScript Result type implementation for Railway Oriented Programming
 * 
 * This library provides a Result type that represents either a success value or an error,
 * enabling Railway Oriented Programming patterns for better error handling.
 */

// Core Result types
export type { Result } from './types';
export type { Success, Failure } from './types';

// Result creation functions
export { ok, err } from './result';

// Type guards
export { isOk, isErr } from './guards';

// Utility functions
export { fromPromise, toPromise } from './utils';
export { mapPromiseResult, mapAsyncPromiseResult } from './utils';

// Do notation and chaining
export { Do } from './do-notation';
export { ResultChain } from './do-notation';

// Zod integration helpers
export { zodToResult } from './zod-helpers';
