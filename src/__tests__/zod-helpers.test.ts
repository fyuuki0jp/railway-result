/**
 * @fileoverview Zod統合ヘルパーのテスト
 * 
 * このファイルでは、zodToResult関数の動作をテストします。
 * Zodライブラリとの統合パターンの使用例も含まれています。
 * 
 * 注意: このテストではZodライブラリの実際のインストールは不要で、
 * Zodの戻り値の形式をシミュレートしてテストしています。
 */

import { describe, it, expect } from 'vitest';
import { zodToResult, isOk, isErr } from '../index';

describe('Zod統合ヘルパー', () => {
  describe('zodToResult関数 - Zod結果のResult型変換', () => {
    it('成功したZod検証結果をResult型に変換できる', () => {
      // Zodの成功結果をシミュレート
      const zodSuccess = {
        success: true,
        data: { name: 'John', age: 30 }
      };

      const result = zodToResult(zodSuccess);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toEqual({ name: 'John', age: 30 });
      }
    });

    it('失敗したZod検証結果をResult型に変換できる', () => {
      // Zodの失敗結果をシミュレート
      const zodFailure = {
        success: false,
        error: {
          issues: [
            { path: ['name'], message: 'Required' },
            { path: ['age'], message: 'Expected number, received string' }
          ]
        }
      };

      const result = zodToResult(zodFailure);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toEqual(zodFailure.error);
      }
    });

    it('エラー情報がない失敗結果の場合はデフォルトエラーを使用', () => {
      const zodFailure = {
        success: false
      };

      const result = zodToResult(zodFailure);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(Error);
        expect((result.error as Error).message).toBe('Validation failed');
      }
    });

    it('dataがundefinedの成功結果はエラーとして扱われる', () => {
      const zodResult = {
        success: true,
        data: undefined
      };

      const result = zodToResult(zodResult);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBeInstanceOf(Error);
        expect((result.error as Error).message).toBe('Validation failed');
      }
    });
  });

  describe('実用的なZod統合の使用例', () => {
    // Zodスキーマの戻り値をシミュレートする関数
    const simulateZodParse = <T>(data: unknown, schema: (data: unknown) => { success: boolean; data?: T; error?: any }) => {
      return schema(data);
    };

    // ユーザースキーマのシミュレーション
    const userSchema = (data: unknown) => {
      if (typeof data === 'object' && data !== null) {
        const obj = data as any;
        if (typeof obj.name === 'string' && typeof obj.age === 'number' && obj.age >= 0) {
          return {
            success: true,
            data: { name: obj.name, age: obj.age }
          };
        }
      }
      return {
        success: false,
        error: {
          issues: [
            { path: ['name'], message: 'Expected string' },
            { path: ['age'], message: 'Expected non-negative number' }
          ]
        }
      };
    };

    it('有効なユーザーデータの検証', () => {
      const userData = { name: 'Alice', age: 25 };
      const zodResult = simulateZodParse(userData, userSchema);
      const result = zodToResult(zodResult);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.name).toBe('Alice');
        expect(result.data.age).toBe(25);
      }
    });

    it('無効なユーザーデータの検証', () => {
      const invalidData = { name: 123, age: 'invalid' };
      const zodResult = simulateZodParse(invalidData, userSchema);
      const result = zodToResult(zodResult);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.issues).toBeDefined();
        expect(result.error.issues.length).toBe(2);
      }
    });

    // 配列データの検証例
    const arraySchema = (data: unknown) => {
      if (Array.isArray(data) && data.every(item => typeof item === 'number')) {
        return {
          success: true,
          data: data as number[]
        };
      }
      return {
        success: false,
        error: {
          issues: [{ path: [], message: 'Expected array of numbers' }]
        }
      };
    };

    it('配列データの検証成功', () => {
      const arrayData = [1, 2, 3, 4, 5];
      const zodResult = simulateZodParse(arrayData, arraySchema);
      const result = zodToResult(zodResult);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toEqual([1, 2, 3, 4, 5]);
      }
    });

    it('配列データの検証失敗', () => {
      const invalidArray = [1, 'two', 3];
      const zodResult = simulateZodParse(invalidArray, arraySchema);
      const result = zodToResult(zodResult);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.issues[0].message).toBe('Expected array of numbers');
      }
    });

    // ネストしたオブジェクトの検証例
    const nestedSchema = (data: unknown) => {
      if (typeof data === 'object' && data !== null) {
        const obj = data as any;
        if (
          typeof obj.user === 'object' &&
          typeof obj.user.name === 'string' &&
          typeof obj.user.profile === 'object' &&
          typeof obj.user.profile.bio === 'string'
        ) {
          return {
            success: true,
            data: {
              user: {
                name: obj.user.name,
                profile: {
                  bio: obj.user.profile.bio
                }
              }
            }
          };
        }
      }
      return {
        success: false,
        error: {
          issues: [{ path: ['user', 'profile'], message: 'Invalid nested structure' }]
        }
      };
    };

    it('ネストしたオブジェクトの検証成功', () => {
      const nestedData = {
        user: {
          name: 'Bob',
          profile: {
            bio: 'Software developer'
          }
        }
      };
      
      const zodResult = simulateZodParse(nestedData, nestedSchema);
      const result = zodToResult(zodResult);
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data.user.name).toBe('Bob');
        expect(result.data.user.profile.bio).toBe('Software developer');
      }
    });

    it('ネストしたオブジェクトの検証失敗', () => {
      const invalidNested = {
        user: {
          name: 'Bob'
          // profile が欠けている
        }
      };
      
      const zodResult = simulateZodParse(invalidNested, nestedSchema);
      const result = zodToResult(zodResult);
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.issues[0].message).toBe('Invalid nested structure');
      }
    });
  });

  describe('Railway Oriented ProgrammingでのZod統合', () => {
    // APIリクエストの検証パイプラインの例
    interface ApiRequest {
      method: string;
      path: string;
      body?: unknown;
    }

    interface ValidatedRequest {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      path: string;
      body: any;
    }

    const methodSchema = (method: unknown) => {
      if (typeof method === 'string' && ['GET', 'POST', 'PUT', 'DELETE'].includes(method)) {
        return { success: true, data: method as 'GET' | 'POST' | 'PUT' | 'DELETE' };
      }
      return { success: false, error: { issues: [{ path: ['method'], message: 'Invalid HTTP method' }] } };
    };

    const pathSchema = (path: unknown) => {
      if (typeof path === 'string' && path.startsWith('/')) {
        return { success: true, data: path };
      }
      return { success: false, error: { issues: [{ path: ['path'], message: 'Path must start with /' }] } };
    };

    it('APIリクエストの検証パイプライン', () => {
      const request: ApiRequest = {
        method: 'POST',
        path: '/api/users',
        body: { name: 'John' }
      };

      // 各フィールドを個別に検証
      const methodResult = zodToResult(methodSchema(request.method));
      const pathResult = zodToResult(pathSchema(request.path));

      expect(isOk(methodResult)).toBe(true);
      expect(isOk(pathResult)).toBe(true);

      if (isOk(methodResult) && isOk(pathResult)) {
        const validatedRequest: ValidatedRequest = {
          method: methodResult.data,
          path: pathResult.data,
          body: request.body
        };

        expect(validatedRequest.method).toBe('POST');
        expect(validatedRequest.path).toBe('/api/users');
        expect(validatedRequest.body).toEqual({ name: 'John' });
      }
    });

    it('無効なAPIリクエストの検証', () => {
      const invalidRequest: ApiRequest = {
        method: 'INVALID',
        path: 'invalid-path'
      };

      const methodResult = zodToResult(methodSchema(invalidRequest.method));
      const pathResult = zodToResult(pathSchema(invalidRequest.path));

      expect(isErr(methodResult)).toBe(true);
      expect(isErr(pathResult)).toBe(true);

      if (isErr(methodResult)) {
        expect(methodResult.error.issues[0].message).toBe('Invalid HTTP method');
      }
      if (isErr(pathResult)) {
        expect(pathResult.error.issues[0].message).toBe('Path must start with /');
      }
    });
  });

  describe('エラーハンドリングのパターン', () => {
    it('複数の検証エラーを収集する', () => {
      const schemas = [
        { name: 'name', schema: (data: unknown) => ({ success: false, error: { message: 'Name is required' } }) },
        { name: 'email', schema: (data: unknown) => ({ success: false, error: { message: 'Invalid email' } }) },
        { name: 'age', schema: (data: unknown) => ({ success: false, error: { message: 'Age must be positive' } }) }
      ];

      const errors = schemas
        .map(({ name, schema }) => ({ name, result: zodToResult(schema(null)) }))
        .filter(({ result }) => isErr(result))
        .map(({ name, result }) => ({ field: name, error: (result as any).error }));

      expect(errors).toHaveLength(3);
      expect(errors[0].field).toBe('name');
      expect(errors[1].field).toBe('email');
      expect(errors[2].field).toBe('age');
    });

    it('最初のエラーで停止するパターン', () => {
      const validateSequentially = (data: unknown) => {
        // 最初の検証
        const firstResult = zodToResult({ success: false, error: { message: 'First validation failed' } });
        if (isErr(firstResult)) {
          return firstResult;
        }

        // 二番目の検証（実行されない）
        const secondResult = zodToResult({ success: true, data: 'second' });
        return secondResult;
      };

      const result = validateSequentially({});
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('First validation failed');
      }
    });
  });
});
