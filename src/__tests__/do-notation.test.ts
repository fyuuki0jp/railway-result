/**
 * @fileoverview Do記法とResultChainのテスト
 * 
 * このファイルでは、Do記法とResultChainクラスの動作をテストします。
 * 関数型プログラミングのモナド的なチェーン処理の使用例も含まれています。
 */

import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, Do, type Result } from '../index.js';

describe('Do記法とResultChain', () => {
  describe('Do関数 - 初期化', () => {
    it('初期値でResultChainを作成できる', async () => {
      const chain = Do(42);
      const result = await chain.run();
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe(42);
      }
    });

    it('文字列値でResultChainを作成できる', async () => {
      const chain = Do('hello');
      const result = await chain.run();
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe('hello');
      }
    });

    it('オブジェクト値でResultChainを作成できる', async () => {
      const data = { name: 'test', value: 123 };
      const chain = Do(data);
      const result = await chain.run();
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toEqual(data);
      }
    });
  });

  describe('map関数 - 値の変換', () => {
    it('値を変換できる', async () => {
      const result = await Do(10)
        .map(x => x * 2)
        .run();
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe(20);
      }
    });

    it('複数のmap操作をチェーンできる', async () => {
      const result = await Do(5)
        .map(x => x * 2)    // 10
        .map(x => x + 3)    // 13
        .map(x => x.toString()) // "13"
        .run();
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe('13');
      }
    });

    it('文字列処理のチェーン', async () => {
      const result = await Do('  Hello World  ')
        .map(s => s.trim())
        .map(s => s.toLowerCase())
        .map(s => s.replace(' ', '_'))
        .run();
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe('hello_world');
      }
    });
  });

  describe('async関数 - 非同期変換', () => {
    it('非同期変換を実行できる', async () => {
      const result = await Do(100)
        .async(async x => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return x / 2;
        })
        .run();
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe(50);
      }
    });

    it('mapとasyncを組み合わせられる', async () => {
      const result = await Do(8)
        .map(x => x * 3)    // 24
        .async(async x => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return x + 6;     // 30
        })
        .map(x => x / 2)    // 15
        .run();
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe(15);
      }
    });
  });

  describe('ensure関数 - 条件検証', () => {
    it('条件を満たす場合は処理を継続する', async () => {
      const result = await Do(42)
        .ensure(x => x > 0, '正の数である必要があります')
        .ensure(x => x < 100, '100未満である必要があります')
        .map(x => x * 2)
        .run();
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe(84);
      }
    });

    it('条件を満たさない場合はエラーになる', async () => {
      const result = await Do(-5)
        .ensure(x => x > 0, '正の数である必要があります')
        .map(x => x * 2)
        .run();
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('正の数である必要があります');
      }
    });

    it('複数のensureで最初の失敗でエラーになる', async () => {
      const result = await Do(150)
        .ensure(x => x > 0, '正の数である必要があります')
        .ensure(x => x < 100, '100未満である必要があります')
        .ensure(x => x % 2 === 0, '偶数である必要があります')
        .run();
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('100未満である必要があります');
      }
    });
  });

  describe('chain関数 - Result型を返す関数のチェーン', () => {
    const validatePositive = (n: number): Result<number, string> => 
      n > 0 ? ok(n) : err('正の数である必要があります');

    const validateEven = (n: number): Result<number, string> => 
      n % 2 === 0 ? ok(n) : err('偶数である必要があります');

    const validateLessThan100 = (n: number): Result<number, string> => 
      n < 100 ? ok(n) : err('100未満である必要があります');

    it('すべての検証が成功する場合', async () => {
      const result = await Do(42)
        .chain(validatePositive)
        .chain(validateEven)
        .chain(validateLessThan100)
        .map(x => x * 2)
        .run();
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe(84);
      }
    });

    it('検証が失敗する場合', async () => {
      const result = await Do(43)
        .chain(validatePositive)
        .chain(validateEven)
        .chain(validateLessThan100)
        .run();
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('偶数である必要があります');
      }
    });

    it('最初の検証で失敗した場合、後続の処理は実行されない', async () => {
      let executionCount = 0;
      
      const countingValidation = (n: number): Result<number, string> => {
        executionCount++;
        return n > 0 ? ok(n) : err('正の数である必要があります');
      };

      const result = await Do(-5)
        .chain(countingValidation)
        .chain(countingValidation)
        .chain(countingValidation)
        .run();
      
      expect(isErr(result)).toBe(true);
      expect(executionCount).toBe(1); // 最初の検証のみ実行される
    });
  });

  describe('chainAsync関数 - 非同期Result型を返す関数のチェーン', () => {
    const asyncValidatePositive = async (n: number): Promise<Result<number, string>> => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return n > 0 ? ok(n) : err('正の数である必要があります');
    };

    const asyncValidateEven = async (n: number): Promise<Result<number, string>> => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return n % 2 === 0 ? ok(n) : err('偶数である必要があります');
    };

    it('非同期検証チェーンが成功する場合', async () => {
      const result = await Do(24)
        .chainAsync(asyncValidatePositive)
        .chainAsync(asyncValidateEven)
        .map(x => x / 2)
        .run();
      
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe(12);
      }
    });

    it('非同期検証チェーンが失敗する場合', async () => {
      const result = await Do(25)
        .chainAsync(asyncValidatePositive)
        .chainAsync(asyncValidateEven)
        .run();
      
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('偶数である必要があります');
      }
    });
  });

  describe('複合的な使用例', () => {
    // ユーザー入力処理の例
    interface UserInput {
      name: string;
      age: string;
      email: string;
    }

    interface ProcessedUser {
      name: string;
      age: number;
      email: string;
    }

    const validateName = (name: string): Result<string, string> => {
      if (name.trim().length === 0) return err('名前は必須です');
      if (name.length > 50) return err('名前は50文字以内で入力してください');
      return ok(name.trim());
    };

    const parseAge = (ageStr: string): Result<number, string> => {
      const age = parseInt(ageStr);
      if (isNaN(age)) return err('年齢は数値で入力してください');
      if (age < 0) return err('年齢は0以上で入力してください');
      if (age > 150) return err('年齢は150以下で入力してください');
      return ok(age);
    };

    const validateEmail = (email: string): Result<string, string> => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return err('有効なメールアドレスを入力してください');
      return ok(email);
    };

    it('ユーザー入力の完全な検証パイプライン', async () => {
      const userInput: UserInput = {
        name: '  田中太郎  ',
        age: '30',
        email: 'tanaka@example.com'
      };

      const result = await Do(userInput)
        .map(input => input.name)
        .chain(validateName)
        .map(name => ({ name, ageStr: userInput.age, email: userInput.email }))
        .chain(data => parseAge(data.ageStr).map(age => ({ ...data, age })))
        .chain(data => validateEmail(data.email).map(email => ({ 
          name: data.name, 
          age: data.age, 
          email 
        })))
        .run();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const user: ProcessedUser = result.data;
        expect(user.name).toBe('田中太郎');
        expect(user.age).toBe(30);
        expect(user.email).toBe('tanaka@example.com');
      }
    });

    it('無効な入力での検証失敗', async () => {
      const invalidInput: UserInput = {
        name: '',
        age: 'abc',
        email: 'invalid-email'
      };

      const result = await Do(invalidInput)
        .map(input => input.name)
        .chain(validateName)
        .run();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('名前は必須です');
      }
    });

    // 非同期データ処理の例
    it('非同期データ取得と変換のパイプライン', async () => {
      const fetchUserData = async (id: number): Promise<Result<{ name: string; score: number }, string>> => {
        await new Promise(resolve => setTimeout(resolve, 20));
        if (id === 1) {
          return ok({ name: 'Alice', score: 85 });
        } else {
          return err('ユーザーが見つかりません');
        }
      };

      const calculateGrade = (score: number): Result<string, string> => {
        if (score >= 90) return ok('A');
        if (score >= 80) return ok('B');
        if (score >= 70) return ok('C');
        if (score >= 60) return ok('D');
        return ok('F');
      };

      const result = await Do(1)
        .chainAsync(fetchUserData)
        .map(user => ({ ...user, grade: '' }))
        .chain(user => calculateGrade(user.score).map(grade => ({ ...user, grade })))
        .map(user => `${user.name}: ${user.score}点 (${user.grade})`)
        .run();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.data).toBe('Alice: 85点 (B)');
      }
    });
  });

  describe('エラーハンドリングの動作確認', () => {
    it('チェーンの途中でエラーが発生した場合、後続の処理は実行されない', async () => {
      let mapExecuted = false;
      let ensureExecuted = false;
      let chainExecuted = false;

      const result = await Do(10)
        .map(x => x * 2)
        .ensure(x => {
          ensureExecuted = true;
          return x < 15; // 20 < 15 は false なのでエラー
        }, 'Too large')
        .map(x => {
          mapExecuted = true;
          return x + 1;
        })
        .chain(x => {
          chainExecuted = true;
          return ok(x);
        })
        .run();

      expect(isErr(result)).toBe(true);
      expect(ensureExecuted).toBe(true);
      expect(mapExecuted).toBe(false);
      expect(chainExecuted).toBe(false);
    });
  });
});
