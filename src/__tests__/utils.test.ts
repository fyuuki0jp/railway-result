/**
 * @fileoverview ユーティリティ関数のテスト
 * 
 * このファイルでは、fromPromise/toPromise/mapPromiseResult/mapAsyncPromiseResult
 * 関数の動作をテストします。Promise とResult型の相互変換の使用例も含まれています。
 */

import { describe, it, expect } from 'vitest';
import { 
  ok, 
  err, 
  isOk, 
  isErr, 
  fromPromise, 
  toPromise, 
  mapPromiseResult, 
  mapAsyncPromiseResult,
  type Result 
} from '../index';

describe('ユーティリティ関数', () => {
  describe('fromPromise関数 - PromiseからResultへの変換', () => {
    it('成功したPromiseをResult型に変換できる', async () => {
      const promise = Promise.resolve(42);
      const result = await fromPromise(promise);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe(42);
      }
    });

    it('失敗したPromiseをResult型に変換できる', async () => {
      const promise = Promise.reject(new Error('Promise error'));
      const result = await fromPromise(promise);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(Error);
        expect((result.error as Error).message).toBe('Promise error');
      }
    });

    it('文字列エラーでも正しく変換される', async () => {
      const promise = Promise.reject('String error');
      const result = await fromPromise(promise);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('String error');
      }
    });

    it('非同期処理の例：ファイル読み込みシミュレーション', async () => {
      const readFileAsync = (filename: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            if (filename.endsWith('.txt')) {
              resolve(`Content of ${filename}`);
            } else {
              reject(new Error('Unsupported file type'));
            }
          }, 10);
        });
      };

      // 成功ケース
      const successResult = await fromPromise(readFileAsync('document.txt'));
      expect(isOk(successResult)).toBe(true);
      if (isOk(successResult)) {
        expect(successResult.data).toBe('Content of document.txt');
      }

      // 失敗ケース
      const failureResult = await fromPromise(readFileAsync('image.png'));
      expect(isErr(failureResult)).toBe(true);
      if (isErr(failureResult)) {
        expect(failureResult.error).toBeInstanceOf(Error);
        expect((failureResult.error as Error).message).toBe('Unsupported file type');
      }
    });
  });

  describe('toPromise関数 - ResultからPromiseへの変換', () => {
    it('成功結果をPromiseに変換できる', async () => {
      const result = ok('success value');
      const promise = toPromise(result);
      
      const value = await promise;
      expect(value).toBe('success value');
    });

    it('失敗結果をPromiseに変換すると拒否される', async () => {
      const result = err('error message');
      const promise = toPromise(result);
      
      await expect(promise).rejects.toBe('error message');
    });

    it('Errorオブジェクトでも正しく拒否される', async () => {
      const error = new Error('Custom error');
      const result = err(error);
      const promise = toPromise(result);
      
      await expect(promise).rejects.toBe(error);
    });

    it('try-catch文での使用例', async () => {
      const processResult = async (result: Result<number, string>): Promise<string> => {
        try {
          const value = await toPromise(result);
          return `処理成功: ${value}`;
        } catch (error) {
          return `処理失敗: ${error}`;
        }
      };

      expect(await processResult(ok(42))).toBe('処理成功: 42');
      expect(await processResult(err('エラー'))).toBe('処理失敗: エラー');
    });
  });

  describe('mapPromiseResult関数 - Promise<Result>の同期変換', () => {
    it('Promise<Result>の成功値を変換できる', async () => {
      const promiseResult = Promise.resolve(ok(10));
      const mapped = await mapPromiseResult(promiseResult, x => x * 2);
      
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.data).toBe(20);
      }
    });

    it('Promise<Result>の失敗値は変換されない', async () => {
      const promiseResult = Promise.resolve(err('error'));
      const mapped = await mapPromiseResult(promiseResult, x => x * 2);
      
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBe('error');
      }
    });

    it('変換関数がResult型を返す場合', async () => {
      const promiseResult = Promise.resolve(ok(5));
      const mapped = await mapPromiseResult(promiseResult, x => 
        x > 0 ? ok(x * 3) : err('negative number')
      );
      
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.data).toBe(15);
      }
    });

    it('変換関数内でエラーが発生した場合', async () => {
      const promiseResult = Promise.resolve(ok(5));
      const mapped = await mapPromiseResult(promiseResult, () => {
        throw new Error('transformation error');
      });
      
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBeInstanceOf(Error);
        expect((mapped.error as Error).message).toBe('transformation error');
      }
    });
  });

  describe('mapAsyncPromiseResult関数 - Promise<Result>の非同期変換', () => {
    it('Promise<Result>の成功値を非同期変換できる', async () => {
      const promiseResult = Promise.resolve(ok(8));
      const mapped = await mapAsyncPromiseResult(promiseResult, async x => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return x * 4;
      });
      
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.data).toBe(32);
      }
    });

    it('Promise<Result>の失敗値は非同期変換されない', async () => {
      const promiseResult = Promise.resolve(err('async error'));
      const mapped = await mapAsyncPromiseResult(promiseResult, async x => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return x * 4;
      });
      
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBe('async error');
      }
    });

    it('非同期変換関数がResult型を返す場合', async () => {
      const promiseResult = Promise.resolve(ok(6));
      const mapped = await mapAsyncPromiseResult(promiseResult, async x => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return x > 5 ? ok(x * 2) : err('too small');
      });
      
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.data).toBe(12);
      }
    });

    it('非同期変換関数内でエラーが発生した場合', async () => {
      const promiseResult = Promise.resolve(ok(3));
      const mapped = await mapAsyncPromiseResult(promiseResult, async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('async transformation error');
      });
      
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBeInstanceOf(Error);
        expect((mapped.error as Error).message).toBe('async transformation error');
      }
    });
  });

  describe('実用的な使用例', () => {
    // APIクライアントの例
    interface User {
      id: number;
      name: string;
      email: string;
    }

    const fetchUser = async (id: number): Promise<User> => {
      // 実際のAPI呼び出しをシミュレート
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (id === 1) {
        return { id: 1, name: 'John Doe', email: 'john@example.com' };
      } else {
        throw new Error(`User with id ${id} not found`);
      }
    };

    it('APIクライアントでのfromPromise使用例', async () => {
      // 成功ケース
      const successResult = await fromPromise(fetchUser(1));
      expect(isOk(successResult)).toBe(true);
      if (isOk(successResult)) {
        expect(successResult.data.name).toBe('John Doe');
        expect(successResult.data.email).toBe('john@example.com');
      }

      // 失敗ケース
      const failureResult = await fromPromise(fetchUser(999));
      expect(isErr(failureResult)).toBe(true);
      if (isErr(failureResult)) {
        expect(failureResult.error).toBeInstanceOf(Error);
        expect((failureResult.error as Error).message).toBe('User with id 999 not found');
      }
    });

    it('データ変換パイプラインの例', async () => {
      const processUserData = async (userId: number): Promise<Result<string, Error>> => {
        const userResult = await fromPromise(fetchUser(userId));
        
        return await mapAsyncPromiseResult(
          Promise.resolve(userResult),
          async user => {
            // ユーザーデータを加工
            await new Promise(resolve => setTimeout(resolve, 20));
            return `${user.name} <${user.email}>`;
          }
        );
      };

      const result = await processUserData(1);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe('John Doe <john@example.com>');
      }
    });

    it('複数の非同期処理の組み合わせ', async () => {
      const processMultipleUsers = async (userIds: number[]): Promise<Result<string[], Error>> => {
        const userPromises = userIds.map(id => fromPromise(fetchUser(id)));
        const userResults = await Promise.all(userPromises);
        
        // すべてのユーザー取得が成功した場合のみ処理を続行
        const allSuccess = userResults.every(isOk);
        if (!allSuccess) {
          const firstError = userResults.find(isErr);
          return firstError || err(new Error('Unknown error'));
        }
        
        const users = userResults.map(r => (r as any).data);
        const userNames = users.map(user => user.name);
        
        return ok(userNames);
      };

      // 成功ケース（存在するユーザーIDのみ）
      const successResult = await processMultipleUsers([1]);
      expect(isOk(successResult)).toBe(true);
      if (isOk(successResult)) {
        expect(successResult.data).toEqual(['John Doe']);
      }

      // 失敗ケース（存在しないユーザーIDを含む）
      const failureResult = await processMultipleUsers([1, 999]);
      expect(isErr(failureResult)).toBe(true);
    });
  });
});
