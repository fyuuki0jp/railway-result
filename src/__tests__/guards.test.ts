/**
 * @fileoverview 型ガード関数のテスト
 * 
 * このファイルでは、isOk/isErr型ガード関数の動作をテストします。
 * TypeScriptの型安全性を活用したパターンの使用例も含まれています。
 */

import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, type Result } from '../index.js';

describe('型ガード関数', () => {
  describe('isOk関数 - 成功結果の判定', () => {
    it('成功結果に対してtrueを返す', () => {
      const result = ok(42);
      expect(isOk(result)).toBe(true);
    });

    it('失敗結果に対してfalseを返す', () => {
      const result = err('error');
      expect(isOk(result)).toBe(false);
    });

    it('型ガードとして機能し、dataプロパティにアクセスできる', () => {
      const result: Result<number, string> = ok(100);
      
      if (isOk(result)) {
        // TypeScriptの型推論により、result.dataにアクセス可能
        expect(result.data).toBe(100);
        expect(typeof result.data).toBe('number');
      } else {
        throw new Error('このブロックは実行されないはず');
      }
    });

    it('複雑な型でも型ガードが機能する', () => {
      interface ComplexData {
        id: number;
        name: string;
        metadata: { created: Date; tags: string[] };
      }

      const complexData: ComplexData = {
        id: 1,
        name: 'test',
        metadata: {
          created: new Date(),
          tags: ['tag1', 'tag2']
        }
      };

      const result: Result<ComplexData, Error> = ok(complexData);
      
      if (isOk(result)) {
        expect(result.data.id).toBe(1);
        expect(result.data.name).toBe('test');
        expect(result.data.metadata.tags).toEqual(['tag1', 'tag2']);
      } else {
        throw new Error('このブロックは実行されないはず');
      }
    });
  });

  describe('isErr関数 - 失敗結果の判定', () => {
    it('失敗結果に対してtrueを返す', () => {
      const result = err('error message');
      expect(isErr(result)).toBe(true);
    });

    it('成功結果に対してfalseを返す', () => {
      const result = ok(42);
      expect(isErr(result)).toBe(false);
    });

    it('型ガードとして機能し、errorプロパティにアクセスできる', () => {
      const result: Result<number, string> = err('something went wrong');
      
      if (isErr(result)) {
        // TypeScriptの型推論により、result.errorにアクセス可能
        expect(result.error).toBe('something went wrong');
        expect(typeof result.error).toBe('string');
      } else {
        throw new Error('このブロックは実行されないはず');
      }
    });

    it('Errorオブジェクトでも型ガードが機能する', () => {
      const error = new Error('Custom error message');
      const result: Result<string, Error> = err(error);
      
      if (isErr(result)) {
        expect(result.error).toBe(error);
        expect(result.error.message).toBe('Custom error message');
        expect(result.error).toBeInstanceOf(Error);
      } else {
        throw new Error('このブロックは実行されないはず');
      }
    });
  });

  describe('型ガードの相互排他性', () => {
    it('isOkとisErrは相互排他的である', () => {
      const successResult = ok('success');
      const failureResult = err('failure');

      // 成功結果の場合
      expect(isOk(successResult)).toBe(true);
      expect(isErr(successResult)).toBe(false);

      // 失敗結果の場合
      expect(isOk(failureResult)).toBe(false);
      expect(isErr(failureResult)).toBe(true);
    });

    it('if-else文での型安全な分岐処理', () => {
      const processResult = (result: Result<number, string>): string => {
        if (isOk(result)) {
          // この分岐では result.data にアクセス可能
          return `成功: ${result.data}`;
        } else {
          // この分岐では result.error にアクセス可能
          return `失敗: ${result.error}`;
        }
      };

      expect(processResult(ok(42))).toBe('成功: 42');
      expect(processResult(err('エラー'))).toBe('失敗: エラー');
    });
  });

  describe('実用的な型ガードの使用例', () => {
    // APIレスポンスの処理例
    interface ApiResponse<T> {
      data?: T;
      error?: string;
      status: number;
    }

    const parseApiResponse = <T>(response: ApiResponse<T>): Result<T, string> => {
      if (response.status >= 200 && response.status < 300 && response.data !== undefined) {
        return ok(response.data);
      } else {
        return err(response.error || `HTTP ${response.status}`);
      }
    };

    it('成功したAPIレスポンスの処理', () => {
      const apiResponse: ApiResponse<{ id: number; name: string }> = {
        data: { id: 1, name: 'John' },
        status: 200
      };

      const result = parseApiResponse(apiResponse);
      
      if (isOk(result)) {
        expect(result.data.id).toBe(1);
        expect(result.data.name).toBe('John');
      } else {
        throw new Error('成功レスポンスのはずです');
      }
    });

    it('失敗したAPIレスポンスの処理', () => {
      const apiResponse: ApiResponse<never> = {
        error: 'Not found',
        status: 404
      };

      const result = parseApiResponse(apiResponse);
      
      if (isErr(result)) {
        expect(result.error).toBe('Not found');
      } else {
        throw new Error('失敗レスポンスのはずです');
      }
    });

    // 配列処理での型ガードの活用
    it('配列内のResult型の処理', () => {
      const results: Result<number, string>[] = [
        ok(1),
        err('エラー1'),
        ok(2),
        ok(3),
        err('エラー2')
      ];

      const successes = results.filter(isOk).map(r => r.data);
      const failures = results.filter(isErr).map(r => r.error);

      expect(successes).toEqual([1, 2, 3]);
      expect(failures).toEqual(['エラー1', 'エラー2']);
    });

    // 条件分岐での型ガードの活用
    it('複数のResult型の組み合わせ処理', () => {
      const combineResults = (
        result1: Result<number, string>,
        result2: Result<number, string>
      ): Result<number, string> => {
        if (isOk(result1) && isOk(result2)) {
          return ok(result1.data + result2.data);
        } else if (isErr(result1)) {
          return result1;
        } else {
          return result2;
        }
      };

      expect(isOk(combineResults(ok(5), ok(3)))).toBe(true);
      expect(isErr(combineResults(err('エラー'), ok(3)))).toBe(true);
      expect(isErr(combineResults(ok(5), err('エラー')))).toBe(true);

      const successResult = combineResults(ok(5), ok(3));
      if (isOk(successResult)) {
        expect(successResult.data).toBe(8);
      }

      const failureResult = combineResults(err('第一エラー'), ok(3));
      if (isErr(failureResult)) {
        expect(failureResult.error).toBe('第一エラー');
      }
    });
  });

  describe('型安全性の検証', () => {
    it('型ガード後のプロパティアクセスが型安全である', () => {
      const result: Result<{ value: number }, { code: string }> = ok({ value: 42 });

      if (isOk(result)) {
        // TypeScriptコンパイラが result.data の型を正しく推論
        const value: number = result.data.value;
        expect(value).toBe(42);
        
        // 以下はコンパイルエラーになるはず（実際のテストでは確認できないが）
        // const error = result.error; // Property 'error' does not exist
      }

      if (isErr(result)) {
        // この分岐は実行されないが、型推論の確認
        const code: string = result.error.code;
        expect(code).toBeDefined(); // 実際には実行されない
      }
    });
  });
});
