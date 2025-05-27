/**
 * @fileoverview 実用的な使用例のテスト
 *
 * このファイルでは、railway-resultライブラリの実際の使用例を示すテストを含みます。
 * 実際のアプリケーションでの使用パターンやベストプラクティスを学ぶことができます。
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from 'vitest';
import {
  ok,
  err,
  isOk,
  isErr,
  Do,
  type Result
} from '../index';

describe('実用的な使用例', () => {
  describe('ユーザー登録システム', () => {
    interface UserRegistrationData {
      username: string;
      email: string;
      password: string;
      confirmPassword: string;
    }

    interface ValidatedUser {
      username: string;
      email: string;
      passwordHash: string;
    }

    // バリデーション関数群
    const validateUsername = (username: string): Result<string, string> => {
      if (username.length < 3) return err('ユーザー名は3文字以上である必要があります');
      if (username.length > 20) return err('ユーザー名は20文字以下である必要があります');
      if (!/^[a-zA-Z0-9_]+$/.test(username)) return err('ユーザー名は英数字とアンダースコアのみ使用可能です');
      return ok(username);
    };

    const validateEmail = (email: string): Result<string, string> => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return err('有効なメールアドレスを入力してください');
      return ok(email);
    };

    const validatePassword = (password: string): Result<string, string> => {
      if (password.length < 8) return err('パスワードは8文字以上である必要があります');
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        return err('パスワードは大文字、小文字、数字を含む必要があります');
      }
      return ok(password);
    };

    const validatePasswordConfirmation = (password: string, confirmPassword: string): Result<string, string> => {
      if (password !== confirmPassword) return err('パスワードが一致しません');
      return ok(password);
    };

    // 非同期処理のシミュレーション
    const checkUsernameAvailability = async (username: string): Promise<Result<string, string>> => {
      await new Promise(resolve => setTimeout(resolve, 50));
      const unavailableUsernames = ['admin', 'root', 'test'];
      if (unavailableUsernames.includes(username.toLowerCase())) {
        return err('このユーザー名は既に使用されています');
      }
      return ok(username);
    };

    const checkEmailAvailability = async (email: string): Promise<Result<string, string>> => {
      await new Promise(resolve => setTimeout(resolve, 30));
      const unavailableEmails = ['admin@example.com', 'test@example.com'];
      if (unavailableEmails.includes(email.toLowerCase())) {
        return err('このメールアドレスは既に登録されています');
      }
      return ok(email);
    };

    const hashPassword = async (password: string): Promise<Result<string, string>> => {
      await new Promise(resolve => setTimeout(resolve, 100));
      // 実際のハッシュ化をシミュレート
      return ok(`hashed_${password}`);
    };

    it('有効なユーザー登録データの処理', async () => {
      const registrationData: UserRegistrationData = {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123'
      };

      const result = await Do(registrationData)
        .chain((data: UserRegistrationData) => validateUsername(data.username).map(username => ({ ...data, username })))
        .chain((data: any) => validateEmail(data.email).map(email => ({ ...data, email })))
        .chain((data: any) => validatePassword(data.password).map(password => ({ ...data, password })))
        .chain((data: any) => validatePasswordConfirmation(data.password, data.confirmPassword).map(() => data))
        .chainAsync(async (data: any) => {
          const usernameResult = await checkUsernameAvailability(data.username);
          return isOk(usernameResult) ? ok(data) : usernameResult;
        })
        .chainAsync(async (data: any) => {
          const emailResult = await checkEmailAvailability(data.email);
          return isOk(emailResult) ? ok(data) : emailResult;
        })
        .chainAsync(async (data: any) => {
          const hashResult = await hashPassword(data.password);
          return isOk(hashResult) ? ok({
            username: data.username,
            email: data.email,
            passwordHash: hashResult.data
          }) : hashResult;
        })
        .run();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const user = result.data as ValidatedUser;
        expect(user.username).toBe('john_doe');
        expect(user.email).toBe('john@example.com');
        expect(user.passwordHash).toBe('hashed_SecurePass123');
      }
    });

    it('無効なユーザー名での登録失敗', async () => {
      const registrationData: UserRegistrationData = {
        username: 'ab', // 短すぎる
        email: 'john@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123'
      };

      const result = await Do(registrationData)
        .chain((data: any) => validateUsername(data.username).map(username => ({ ...data, username })))
        .run();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('ユーザー名は3文字以上である必要があります');
      }
    });

    it('既に使用されているユーザー名での登録失敗', async () => {
      const registrationData: UserRegistrationData = {
        username: 'admin', // 使用不可
        email: 'john@example.com',
        password: 'SecurePass123',
        confirmPassword: 'SecurePass123'
      };

      const result = await Do(registrationData)
        .chain((data: any) => validateUsername(data.username).map(username => ({ ...data, username })))
        .chain((data: any) => validateEmail(data.email).map(email => ({ ...data, email })))
        .chain((data: any) => validatePassword(data.password).map(password => ({ ...data, password })))
        .chain((data: any) => validatePasswordConfirmation(data.password, data.confirmPassword).map(() => data))
        .chainAsync(async (data: any) => {
          const usernameResult = await checkUsernameAvailability(data.username);
          return isOk(usernameResult) ? ok(data) : usernameResult;
        })
        .run();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('このユーザー名は既に使用されています');
      }
    });
  });

  describe('ファイル処理システム', () => {
    interface FileMetadata {
      name: string;
      size: number;
      type: string;
    }

    interface ProcessedFile {
      name: string;
      size: number;
      type: string;
      content: string;
      checksum: string;
    }

    // ファイル処理関数群
    const validateFileSize = (metadata: FileMetadata): Result<FileMetadata, string> => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (metadata.size > maxSize) return err('ファイルサイズが大きすぎます（最大10MB）');
      if (metadata.size === 0) return err('空のファイルはアップロードできません');
      return ok(metadata);
    };

    const validateFileType = (metadata: FileMetadata): Result<FileMetadata, string> => {
      const allowedTypes = ['text/plain', 'application/json', 'text/csv'];
      if (!allowedTypes.includes(metadata.type)) {
        return err('サポートされていないファイル形式です');
      }
      return ok(metadata);
    };

    const readFileContent = async (metadata: FileMetadata): Promise<Result<string, string>> => {
      await new Promise(resolve => setTimeout(resolve, 100));

      // ファイル読み込みをシミュレート
      if (metadata.name.includes('corrupted')) {
        return err('ファイルが破損しています');
      }

      return ok(`Content of ${metadata.name}`);
    };

    const calculateChecksum = async (content: string): Promise<Result<string, string>> => {
      await new Promise(resolve => setTimeout(resolve, 50));

      // チェックサム計算をシミュレート
      if (content.includes('invalid')) {
        return err('チェックサム計算に失敗しました');
      }

      return ok(`checksum_${content.length}`);
    };

    it('有効なファイルの処理', async () => {
      const fileMetadata: FileMetadata = {
        name: 'document.txt',
        size: 1024,
        type: 'text/plain'
      };

      const result = await Do(fileMetadata)
        .chain(validateFileSize)
        .chain(validateFileType)
        .chainAsync(async (metadata: any) => {
          const contentResult = await readFileContent(metadata);
          return isOk(contentResult) ? ok({ ...metadata, content: contentResult.data }) : contentResult;
        })
        .chainAsync(async (data: any) => {
          const checksumResult = await calculateChecksum(data.content);
          return isOk(checksumResult) ? ok({ ...data, checksum: checksumResult.data }) : checksumResult;
        })
        .run();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const processedFile = result.data as ProcessedFile;
        expect(processedFile.name).toBe('document.txt');
        expect(processedFile.content).toBe('Content of document.txt');
        expect(processedFile.checksum).toBe('checksum_23');
      }
    });

    it('サイズが大きすぎるファイルの処理失敗', async () => {
      const largeFile: FileMetadata = {
        name: 'large.txt',
        size: 20 * 1024 * 1024, // 20MB
        type: 'text/plain'
      };

      const result = await Do(largeFile)
        .chain(validateFileSize)
        .run();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('ファイルサイズが大きすぎます（最大10MB）');
      }
    });

    it('破損したファイルの処理失敗', async () => {
      const corruptedFile: FileMetadata = {
        name: 'corrupted.txt',
        size: 1024,
        type: 'text/plain'
      };

      const result = await Do(corruptedFile)
        .chain(validateFileSize)
        .chain(validateFileType)
        .chainAsync(async (metadata: any) => {
          const contentResult = await readFileContent(metadata);
          return isOk(contentResult) ? ok({ ...metadata, content: contentResult.data }) : contentResult;
        })
        .run();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('ファイルが破損しています');
      }
    });
  });

  describe('APIクライアントシステム', () => {
    interface ApiConfig {
      baseUrl: string;
      apiKey: string;
      timeout: number;
    }

    interface ApiResponse<T> {
      status: number;
      data: T;
      headers: Record<string, string>;
    }

    // API関連の関数群
    const validateApiConfig = (config: ApiConfig): Result<ApiConfig, string> => {
      if (!config.baseUrl.startsWith('https://')) {
        return err('APIのベースURLはHTTPSである必要があります');
      }
      if (config.apiKey.length < 10) {
        return err('APIキーが短すぎます');
      }
      if (config.timeout <= 0 || config.timeout > 30000) {
        return err('タイムアウトは1ms以上30秒以下である必要があります');
      }
      return ok(config);
    };

    const makeApiRequest = async <T>(
      _config: ApiConfig,
      endpoint: string
    ): Promise<Result<ApiResponse<T>, string>> => {
      await new Promise(resolve => setTimeout(resolve, 100));

      // API呼び出しをシミュレート
      if (endpoint.includes('error')) {
        return err('API呼び出しに失敗しました');
      }

      if (endpoint.includes('timeout')) {
        return err('リクエストがタイムアウトしました');
      }

      return ok({
        status: 200,
        data: { message: `Response from ${endpoint}` } as T,
        headers: { 'content-type': 'application/json' }
      });
    };

    const parseApiResponse = <T>(response: ApiResponse<T>): Result<T, string> => {
      if (response.status >= 200 && response.status < 300) {
        return ok(response.data);
      } else if (response.status >= 400 && response.status < 500) {
        return err('クライアントエラーが発生しました');
      } else {
        return err('サーバーエラーが発生しました');
      }
    };

    it('正常なAPI呼び出し', async () => {
      const config: ApiConfig = {
        baseUrl: 'https://api.example.com',
        apiKey: 'valid_api_key_123',
        timeout: 5000
      };

      const result = await Do(config)
        .chain(validateApiConfig)
        .chainAsync((validConfig: any) =>
          makeApiRequest<{ message: string }>(validConfig, '/users')
        )
        .chain(parseApiResponse)
        .run();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect((result.data as { message: string }).message).toBe('Response from /users');
      }
    });

    it('無効なAPI設定での失敗', async () => {
      const invalidConfig: ApiConfig = {
        baseUrl: 'http://api.example.com', // HTTPSではない
        apiKey: 'short',
        timeout: 5000
      };

      const result = await Do(invalidConfig)
        .chain(validateApiConfig)
        .run();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('APIのベースURLはHTTPSである必要があります');
      }
    });

    it('API呼び出しエラーでの失敗', async () => {
      const config: ApiConfig = {
        baseUrl: 'https://api.example.com',
        apiKey: 'valid_api_key_123',
        timeout: 5000
      };

      const result = await Do(config)
        .chain(validateApiConfig)
        .chainAsync((validConfig: any) =>
          makeApiRequest(validConfig, '/error-endpoint')
        )
        .run();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('API呼び出しに失敗しました');
      }
    });
  });

  describe('データ変換パイプライン', () => {
    interface RawData {
      id: string;
      timestamp: string;
      value: string;
      metadata: string;
    }

    interface ProcessedData {
      id: number;
      timestamp: Date;
      value: number;
      metadata: Record<string, any>;
    }

    // データ変換関数群
    const parseId = (id: string): Result<number, string> => {
      const parsed = parseInt(id);
      if (isNaN(parsed)) return err('IDが数値ではありません');
      if (parsed <= 0) return err('IDは正の数である必要があります');
      return ok(parsed);
    };

    const parseTimestamp = (timestamp: string): Result<Date, string> => {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return err('無効な日時形式です');
      return ok(date);
    };

    const parseValue = (value: string): Result<number, string> => {
      const parsed = parseFloat(value);
      if (isNaN(parsed)) return err('値が数値ではありません');
      return ok(parsed);
    };

    const parseMetadata = (metadata: string): Result<Record<string, any>, string> => {
      try {
        const parsed = JSON.parse(metadata);
        if (typeof parsed !== 'object' || parsed === null) {
          return err('メタデータはオブジェクトである必要があります');
        }
        return ok(parsed);
      } catch {
        return err('メタデータのJSON解析に失敗しました');
      }
    };

    it('有効なデータの変換', async () => {
      const rawData: RawData = {
        id: '123',
        timestamp: '2023-12-01T10:00:00Z',
        value: '42.5',
        metadata: '{"category": "test", "priority": 1}'
      };

      const result = await Do(rawData)
        .chain((data: any) => parseId(data.id).map(id => ({ ...data, parsedId: id })))
        .chain((data: any) => parseTimestamp(data.timestamp).map(timestamp => ({ ...data, parsedTimestamp: timestamp })))
        .chain((data: any) => parseValue(data.value).map(value => ({ ...data, parsedValue: value })))
        .chain((data: any) => parseMetadata(data.metadata).map(metadata => ({
          id: data.parsedId,
          timestamp: data.parsedTimestamp,
          value: data.parsedValue,
          metadata
        })))
        .run();

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const processed = result.data as ProcessedData;
        expect(processed.id).toBe(123);
        expect(processed.timestamp).toBeInstanceOf(Date);
        expect(processed.value).toBe(42.5);
        expect(processed.metadata.category).toBe('test');
        expect(processed.metadata.priority).toBe(1);
      }
    });

    it('無効なJSONメタデータでの変換失敗', async () => {
      const rawData: RawData = {
        id: '123',
        timestamp: '2023-12-01T10:00:00Z',
        value: '42.5',
        metadata: 'invalid json'
      };

      const result = await Do(rawData)
        .chain((data: any) => parseId(data.id).map(id => ({ ...data, parsedId: id })))
        .chain((data: any) => parseTimestamp(data.timestamp).map(timestamp => ({ ...data, parsedTimestamp: timestamp })))
        .chain((data: any) => parseValue(data.value).map(value => ({ ...data, parsedValue: value })))
        .chain((data: any) => parseMetadata(data.metadata).map(metadata => ({
          id: data.parsedId,
          timestamp: data.parsedTimestamp,
          value: data.parsedValue,
          metadata
        })))
        .run();

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error).toBe('メタデータのJSON解析に失敗しました');
      }
    });
  });
});
