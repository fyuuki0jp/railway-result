/**
 * Helper functions for integrating with Zod validation library
 */

import type { Result } from './types.js';
import { ok, err } from './result.js';

/**
 * Helper function to convert Zod SafeParseReturnType to Result
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodToResult<T>(zodResult: { success: boolean; data?: T; error?: any }): Result<T> {
  if (zodResult.success && zodResult.data !== undefined) {
    return ok(zodResult.data);
  } else {
    return err(zodResult.error || new Error("Validation failed"));
  }
}
