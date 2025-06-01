/**
 * @fileoverview 統合テスト
 * 
 * このファイルでは、railway-resultライブラリの複数機能を組み合わせた
 * 統合テストを実行します。実際のアプリケーションでの複雑な使用パターンを
 * テストし、ライブラリ全体の動作を検証します。
 */

import { describe, it, expect } from 'vitest';
import { 
  ok, 
  err, 
  isOk, 
  isErr, 
  Do, 
  fromPromise, 
  toPromise,
  mapPromiseResult,
  mapAsyncPromiseResult,
  zodToResult,
  type Result 
} from '../index.js';

describe('統合テスト', () => {
  describe('複合的なデータ処理パイプライン', () => {
    // 複雑なデータ構造
    interface InputData {
      users: Array<{
        id: string;
        name: string;
        email: string;
        profile: {
          age: string;
          preferences: string; // JSON文字列
        };
      }>;
      settings: {
        validation: {
          minAge: number;
          maxAge: number;
        };
      };
    }

    interface ProcessedUser {
      id: number;
      name: string;
      email: string;
      age: number;
      preferences: Record<string, any>;
    }

    interface ProcessingResult {
      validUsers: ProcessedUser[];
      errors: Array<{ userId: string; error: string }>;
      summary: {
        total: number;
        valid: number;
        invalid: number;
      };
    }

    // 複合的な処理関数群
    const validateAndProcessUser = async (
      user: InputData['users'][0], 
      settings: InputData['settings']
    ): Promise<Result<ProcessedUser, string>> => {
      return await Do(user)
        .chain(u => {
          const id = parseInt(u.id);
          return isNaN(id) ? err(`無効なID: ${u.id}`) : ok({ ...u, parsedId: id });
        })
        .chain(u => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(u.email) 
            ? ok(u) 
            : err(`無効なメール: ${u.email}`);
        })
        .chain(u => {
          const age = parseInt(u.profile.age);
          if (isNaN(age)) return err(`無効な年齢: ${u.profile.age}`);
          if (age < settings.validation.minAge) return err(`年齢が最小値未満: ${age}`);
          if (age > settings.validation.maxAge) return err(`年齢が最大値超過: ${age}`);
          return ok({ ...u, parsedAge: age });
        })
        .chainAsync(async u => {
          // 非同期でpreferencesをパース
          await new Promise(resolve => setTimeout(resolve, 10));
          try {
            const preferences = JSON.parse(u.profile.preferences);
            return ok({
              id: u.parsedId,
              name: u.name,
              email: u.email,
              age: u.parsedAge,
              preferences
            });
          } catch {
            return err(`無効なpreferences JSON: ${u.profile.preferences}`);
          }
        })
        .run();
    };

    const processAllUsers = async (inputData: InputData): Promise<Result<ProcessingResult, string>> => {
      const userPromises = inputData.users.map(async user => {
        const result = await validateAndProcessUser(user, inputData.settings);
        return { userId: user.id, result };
      });

      const userResults = await Promise.all(userPromises);
      
      const validUsers: ProcessedUser[] = [];
      const errors: Array<{ userId: string; error: string }> = [];

      userResults.forEach(({ userId, result }) => {
        if (isOk(result)) {
          validUsers.push(result.data);
        } else {
          errors.push({ userId, error: result.error });
        }
      });

      const summary = {
        total: inputData.users.length,
        valid: validUsers.length,
        invalid: errors.length
      };

      return ok({ validUsers, errors, summary });
    };

    it('複合的なデータ処理の成功ケース', async () => {
      const inputData: InputData = {
        users: [
          {
            id: '1',
            name: 'Alice',
            email: 'alice@example.com',
            profile: {
              age: '25',
              preferences: '{"theme": "dark", "notifications": true}'
            }
          },
          {
            id: '2',
            name: 'Bob',
            email: 'bob@example.com',
            profile: {
              age: '30',
              preferences: '{"theme": "light", "notifications": false}'
            }
          }
        ],
        settings: {
          validation: {
            minAge: 18,
            maxAge: 65
          }
        }
      };

      const result = await processAllUsers(inputData);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const processed = result.data;
        expect(processed.validUsers).toHaveLength(2);
        expect(processed.errors).toHaveLength(0);
        expect(processed.summary.total).toBe(2);
        expect(processed.summary.valid).toBe(2);
        expect(processed.summary.invalid).toBe(0);
        
        expect(processed.validUsers[0].name).toBe('Alice');
        expect(processed.validUsers[0].preferences.theme).toBe('dark');
        expect(processed.validUsers[1].name).toBe('Bob');
        expect(processed.validUsers[1].preferences.notifications).toBe(false);
      }
    });

    it('部分的な失敗を含む複合処理', async () => {
      const inputData: InputData = {
        users: [
          {
            id: '1',
            name: 'Alice',
            email: 'alice@example.com',
            profile: {
              age: '25',
              preferences: '{"theme": "dark"}'
            }
          },
          {
            id: 'invalid',
            name: 'Bob',
            email: 'invalid-email',
            profile: {
              age: '30',
              preferences: '{"theme": "light"}'
            }
          },
          {
            id: '3',
            name: 'Charlie',
            email: 'charlie@example.com',
            profile: {
              age: '17', // 最小年齢未満
              preferences: '{"theme": "auto"}'
            }
          }
        ],
        settings: {
          validation: {
            minAge: 18,
            maxAge: 65
          }
        }
      };

      const result = await processAllUsers(inputData);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const processed = result.data;
        expect(processed.validUsers).toHaveLength(1);
        expect(processed.errors).toHaveLength(2);
        expect(processed.summary.total).toBe(3);
        expect(processed.summary.valid).toBe(1);
        expect(processed.summary.invalid).toBe(2);
        
        expect(processed.validUsers[0].name).toBe('Alice');
        expect(processed.errors[0].userId).toBe('invalid');
        expect(processed.errors[0].error).toBe('無効なID: invalid');
        expect(processed.errors[1].userId).toBe('3');
        expect(processed.errors[1].error).toBe('年齢が最小値未満: 17');
      }
    });
  });

  describe('Promise統合とエラーハンドリング', () => {
    // 外部APIとの統合をシミュレート
    const fetchExternalData = async (id: number): Promise<{ id: number; data: string }> => {
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (id === 404) {
        throw new Error('Not found');
      }
      if (id === 500) {
        throw new Error('Server error');
      }
      
      return { id, data: `External data for ${id}` };
    };

    const processExternalData = (data: { id: number; data: string }): Result<string, string> => {
      if (data.data.includes('error')) {
        return err('データに問題があります');
      }
      return ok(data.data.toUpperCase());
    };

    it('Promise統合の成功パターン', async () => {
      const ids = [1, 2, 3];
      
      const results = await Promise.all(
        ids.map(async id => {
          const promiseResult = fromPromise(fetchExternalData(id));
          return await mapPromiseResult(promiseResult, processExternalData);
        })
      );

      expect(results.every(isOk)).toBe(true);
      
      const processedData = results
        .filter(isOk)
        .map(r => r.data);
      
      expect(processedData).toEqual([
        'EXTERNAL DATA FOR 1',
        'EXTERNAL DATA FOR 2',
        'EXTERNAL DATA FOR 3'
      ]);
    });

    it('Promise統合の失敗パターン', async () => {
      const ids = [1, 404, 3];
      
      const results = await Promise.all(
        ids.map(async id => {
          const promiseResult = fromPromise(fetchExternalData(id));
          return await mapPromiseResult(promiseResult, processExternalData);
        })
      );

      const successes = results.filter(isOk);
      const failures = results.filter(isErr);
      
      expect(successes).toHaveLength(2);
      expect(failures).toHaveLength(1);
      
      if (isErr(failures[0])) {
        expect(failures[0].error.message).toBe('Not found');
      }
    });

    it('非同期チェーンとPromise統合', async () => {
      const processChain = async (id: number): Promise<Result<string, string>> => {
        return await Do(id)
          .ensure(id => id > 0, 'IDは正の数である必要があります')
          .chainAsync(async id => {
            const result = await fromPromise(fetchExternalData(id));
            return result;
          })
          .chain(processExternalData)
          .map(data => `Processed: ${data}`)
          .run();
      };

      const validResult = await processChain(1);
      expect(isOk(validResult)).toBe(true);
      if (isOk(validResult)) {
        expect(validResult.data).toBe('Processed: EXTERNAL DATA FOR 1');
      }

      const invalidIdResult = await processChain(-1);
      expect(isErr(invalidIdResult)).toBe(true);
      if (isErr(invalidIdResult)) {
        expect(invalidIdResult.error).toBe('IDは正の数である必要があります');
      }

      const notFoundResult = await processChain(404);
      expect(isErr(notFoundResult)).toBe(true);
      if (isErr(notFoundResult)) {
        expect(notFoundResult.error.message).toBe('Not found');
      }
    });
  });

  describe('Zod統合とバリデーション', () => {
    // Zodスキーマのシミュレーション
    const userSchema = (data: unknown) => {
      if (typeof data === 'object' && data !== null) {
        const obj = data as any;
        if (
          typeof obj.name === 'string' && obj.name.length > 0 &&
          typeof obj.age === 'number' && obj.age >= 0 &&
          typeof obj.email === 'string' && obj.email.includes('@')
        ) {
          return {
            success: true,
            data: { name: obj.name, age: obj.age, email: obj.email }
          };
        }
      }
      return {
        success: false,
        error: { issues: [{ message: 'Invalid user data' }] }
      };
    };

    const validateAndProcessUsers = async (users: unknown[]): Promise<Result<any[], string>> => {
      const validationPromises = users.map(async (user, index) => {
        const zodResult = userSchema(user);
        const result = zodToResult(zodResult);
        
        if (isOk(result)) {
          // 追加の非同期処理
          await new Promise(resolve => setTimeout(resolve, 10));
          return ok({ ...result.data, index });
        } else {
          return err(`User ${index}: ${result.error.issues[0].message}`);
        }
      });

      const results = await Promise.all(validationPromises);
      const validUsers = results.filter(isOk).map(r => r.data);
      const errors = results.filter(isErr);

      if (errors.length > 0) {
        return err(`Validation failed: ${errors.map(e => e.error).join(', ')}`);
      }

      return ok(validUsers);
    };

    it('Zod統合での成功パターン', async () => {
      const users = [
        { name: 'Alice', age: 25, email: 'alice@example.com' },
        { name: 'Bob', age: 30, email: 'bob@example.com' }
      ];

      const result = await validateAndProcessUsers(users);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe('Alice');
        expect(result.data[0].index).toBe(0);
        expect(result.data[1].name).toBe('Bob');
        expect(result.data[1].index).toBe(1);
      }
    });

    it('Zod統合での失敗パターン', async () => {
      const users = [
        { name: 'Alice', age: 25, email: 'alice@example.com' },
        { name: '', age: -5, email: 'invalid' }, // 無効なデータ
        { name: 'Charlie', age: 35, email: 'charlie@example.com' }
      ];

      const result = await validateAndProcessUsers(users);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toContain('User 1: Invalid user data');
      }
    });
  });

  describe('toPromise統合とエラー伝播', () => {
    const processWithPromiseConversion = async (value: number): Promise<string> => {
      const result = await Do(value)
        .ensure(v => v > 0, '値は正の数である必要があります')
        .map(v => v * 2)
        .ensure(v => v < 100, '結果が大きすぎます')
        .map(v => `Result: ${v}`)
        .run();

      // ResultをPromiseに変換（失敗時は例外をスロー）
      return toPromise(result);
    };

    it('toPromiseでの成功パターン', async () => {
      const result = await processWithPromiseConversion(20);
      expect(result).toBe('Result: 40');
    });

    it('toPromiseでの失敗パターン（例外キャッチ）', async () => {
      await expect(processWithPromiseConversion(-5))
        .rejects.toBe('値は正の数である必要があります');
      
      await expect(processWithPromiseConversion(60))
        .rejects.toBe('結果が大きすぎます');
    });

    it('try-catchでのエラーハンドリング', async () => {
      const safeProcess = async (value: number): Promise<Result<string, string>> => {
        try {
          const result = await processWithPromiseConversion(value);
          return ok(result);
        } catch (error) {
          return err(error as string);
        }
      };

      const successResult = await safeProcess(20);
      expect(isOk(successResult)).toBe(true);
      if (isOk(successResult)) {
        expect(successResult.data).toBe('Result: 40');
      }

      const failureResult = await safeProcess(-5);
      expect(isErr(failureResult)).toBe(true);
      if (isErr(failureResult)) {
        expect(failureResult.error).toBe('値は正の数である必要があります');
      }
    });
  });

  describe('大規模データ処理のパフォーマンス', () => {
    it('大量のデータを効率的に処理できる', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        value: Math.random() * 100
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        largeDataset.map(async item => {
          return await Do(item)
            .ensure(item => item.id > 0, 'Invalid ID')
            .ensure(item => item.value >= 0, 'Invalid value')
            .map(item => ({ ...item, processed: true }))
            .run();
        })
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      const successCount = results.filter(isOk).length;
      const errorCount = results.filter(isErr).length;

      expect(successCount).toBe(1000);
      expect(errorCount).toBe(0);
      expect(processingTime).toBeLessThan(1000); // 1秒以内で処理完了
    });
  });
});
