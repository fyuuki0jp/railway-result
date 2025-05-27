/**
 * Do notation implementation for Result types
 */

import type { Result } from './types';
import { ok, err } from './result';
import { isOk } from './guards';

/**
 * Result型のDo記法風の実装
 * 連続した操作を平坦化して記述できるようにする
 */
export function Do<T, E = string>(initialValue: T): ResultChain<T, E> {
  return new ResultChain(Promise.resolve(ok(initialValue)));
}

/**
 * Result型の操作をチェーンするためのクラス
 */
export class ResultChain<T, E = string> {
  constructor(private readonly result: Promise<Result<T, E>>) {}

  /**
   * 値を変換する
   */
  map<U>(fn: (value: T) => U): ResultChain<U, E> {
    return new ResultChain(this.result.then(r => r.map(fn)));
  }

  /**
   * 非同期変換を行う
   */
  async<U>(fn: (value: T) => Promise<U>): ResultChain<U, E> {
    return new ResultChain(this.result.then(r => r.map(fn)));
  }

  /**
   * 条件によって失敗を返す
   */
  ensure(predicate: (value: T) => boolean, errorMsg: E): ResultChain<T, E> {
    return new ResultChain(
      this.result.then(async r => {
        if (isOk(r)) {
          return predicate(r.data) ? r : err(errorMsg);
        }
        return r;
      })
    );
  }

  /**
   * 別のResult型を返す関数に変換する
   */
  chain<U, F = E>(fn: (value: T) => Result<U, F>): ResultChain<U, E | F> {
    return new ResultChain(
      this.result.then(async r => {
        if (isOk(r)) {
          const nextResult = fn(r.data);
          return nextResult as Result<U, E | F>;
        }
        return r as Result<U, E | F>;
      })
    );
  }

  /**
   * 非同期でResult型を返す関数に変換する
   */
  chainAsync<U, F = E>(fn: (value: T) => Promise<Result<U, F>>): ResultChain<U, E | F> {
    return new ResultChain(
      this.result.then(async r => {
        if (isOk(r)) {
          const nextResult = await fn(r.data);
          return nextResult as Result<U, E | F>;
        }
        return r as Result<U, E | F>;
      })
    );
  }

  /**
   * 最終的な結果を取得する
   */
  async run(): Promise<Result<T, E>> {
    return this.result;
  }
}
