/**
 * @fileoverview Result型の基本機能テスト
 * 
 * このファイルでは、ok/err関数とSuccess/Failureの基本動作をテストします。
 * Railway Oriented Programmingの基本的なパターンの使用例も含まれています。
 */

import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, type Result } from '../index.js';

describe('Result基本機能', () => {
  describe('ok関数 - 成功結果の作成', () => {
    it('成功結果を作成できる', () => {
      const result = ok(42);
      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
    });

    it('文字列値で成功結果を作成できる', () => {
      const result = ok('hello');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello');
    });

    it('オブジェクト値で成功結果を作成できる', () => {
      const data = { name: 'test', value: 123 };
      const result = ok(data);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('null値でも成功結果を作成できる', () => {
      const result = ok(null);
      expect(result.success).toBe(true);
      expect(result.data).toBe(null);
    });
  });

  describe('err関数 - 失敗結果の作成', () => {
    it('失敗結果を作成できる', () => {
      const result = err('error message');
      expect(result.success).toBe(false);
      expect(result.error).toBe('error message');
    });

    it('Errorオブジェクトで失敗結果を作成できる', () => {
      const error = new Error('Something went wrong');
      const result = err(error);
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });

    it('カスタムエラー型で失敗結果を作成できる', () => {
      interface CustomError {
        code: number;
        message: string;
      }
      
      const customError: CustomError = { code: 404, message: 'Not found' };
      const result = err(customError);
      expect(result.success).toBe(false);
      expect(result.error).toEqual(customError);
    });
  });

  describe('map関数 - 値の変換', () => {
    it('成功結果の値を変換できる', async () => {
      const result = ok(10);
      const mapped = await result.map(x => x * 2);
      
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.data).toBe(20);
      }
    });

    it('失敗結果はmapで変換されない', async () => {
      const result = err('error');
      const mapped = await result.map(x => x * 2);
      
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBe('error');
      }
    });

    it('map関数内でエラーが発生した場合は失敗結果になる', async () => {
      const result = ok(10);
      const mapped = await result.map(() => {
        throw new Error('map error');
      });
      
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBeInstanceOf(Error);
        expect((mapped.error as Error).message).toBe('map error');
      }
    });
  });

  describe('Promise対応のmap関数', () => {
    it('非同期関数でmapできる', async () => {
      const result = ok(5);
      const mapped = await result.map(async x => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return x * 3;
      });
      
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.data).toBe(15);
      }
    });

    it('非同期関数でResult型を返すmapができる', async () => {
      const result = ok(5);
      const mapped = await result.map(async x => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return x > 0 ? ok(x * 2) : err('negative number');
      });
      
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.data).toBe(10);
      }
    });

    it('非同期関数内でエラーが発生した場合は失敗結果になる', async () => {
      const result = ok(5);
      const mapped = await result.map(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        throw new Error('async error');
      });
      
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBeInstanceOf(Error);
        expect((mapped.error as Error).message).toBe('async error');
      }
    });
  });

  describe('mapAsync関数 - 非同期変換の別名', () => {
    it('mapAsyncはmapの別名として動作する', async () => {
      const result = ok(7);
      const mapped = await result.mapAsync(async x => x * 4);
      
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.data).toBe(28);
      }
    });
  });
});

describe('Railway Oriented Programming パターンの例', () => {
  // 実用的な例：ユーザー入力の検証パイプライン
  interface User {
    name: string;
    age: number;
    email: string;
  }

  const validateName = (name: string): Result<string, string> => {
    if (name.trim().length === 0) {
      return err('名前は必須です');
    }
    if (name.length > 50) {
      return err('名前は50文字以内で入力してください');
    }
    return ok(name.trim());
  };

  const validateAge = (age: number): Result<number, string> => {
    if (age < 0) {
      return err('年齢は0以上である必要があります');
    }
    if (age > 150) {
      return err('年齢は150以下である必要があります');
    }
    return ok(age);
  };

  const validateEmail = (email: string): Result<string, string> => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return err('有効なメールアドレスを入力してください');
    }
    return ok(email);
  };

  it('有効なユーザーデータの検証パイプライン', async () => {
    const userData = { name: '  田中太郎  ', age: 30, email: 'tanaka@example.com' };
    
    // Railway Oriented Programming パターンでの検証
    const nameResult = validateName(userData.name);
    const ageResult = validateAge(userData.age);
    const emailResult = validateEmail(userData.email);
    
    // すべての検証が成功した場合のみユーザーオブジェクトを作成
    if (isOk(nameResult) && isOk(ageResult) && isOk(emailResult)) {
      const user: User = {
        name: nameResult.data,
        age: ageResult.data,
        email: emailResult.data
      };
      
      expect(user.name).toBe('田中太郎');
      expect(user.age).toBe(30);
      expect(user.email).toBe('tanaka@example.com');
    } else {
      throw new Error('検証が失敗しました');
    }
  });

  it('無効なユーザーデータの検証エラー', () => {
    const invalidUserData = { name: '', age: -5, email: 'invalid-email' };
    
    const nameResult = validateName(invalidUserData.name);
    const ageResult = validateAge(invalidUserData.age);
    const emailResult = validateEmail(invalidUserData.email);
    
    expect(isErr(nameResult)).toBe(true);
    expect(isErr(ageResult)).toBe(true);
    expect(isErr(emailResult)).toBe(true);
    
    if (isErr(nameResult)) {
      expect(nameResult.error).toBe('名前は必須です');
    }
    if (isErr(ageResult)) {
      expect(ageResult.error).toBe('年齢は0以上である必要があります');
    }
    if (isErr(emailResult)) {
      expect(emailResult.error).toBe('有効なメールアドレスを入力してください');
    }
  });

  it('map関数を使った変換チェーン', async () => {
    const processNumber = async (input: string): Promise<Result<number, string>> => {
      return await ok(input)
        .map(s => s.trim())
        .then(r => r.map(s => s.length > 0 ? ok(s) : err('空の文字列です')))
        .then(r => r.map(s => {
          const num = parseInt(s);
          return isNaN(num) ? err('数値ではありません') : ok(num);
        }))
        .then(r => r.map(n => n > 0 ? ok(n) : err('正の数である必要があります')))
        .then(r => r.map(n => n * 2)); // 最終的に2倍にする
    };

    const validResult = await processNumber('  42  ');
    expect(isOk(validResult)).toBe(true);
    if (isOk(validResult)) {
      expect(validResult.data).toBe(84);
    }

    const invalidResult = await processNumber('abc');
    expect(isErr(invalidResult)).toBe(true);
    if (isErr(invalidResult)) {
      expect(invalidResult.error).toBe('数値ではありません');
    }
  });
});
