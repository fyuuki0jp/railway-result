# @fyuuki0jp/railway-result

TypeScript Result type implementation for Railway Oriented Programming.

## テストとサンプルコード

このパッケージには包括的なテストスイートが含まれており、実際の使用例を兼ねたexampleコードとしても機能します。

### テストファイル構成

- **`result.test.ts`** - Result型の基本機能（ok/err関数、map関数、Promise対応）
- **`guards.test.ts`** - 型ガード関数（isOk/isErr）の動作と型安全性
- **`utils.test.ts`** - ユーティリティ関数（fromPromise/toPromise/mapPromiseResult）
- **`do-notation.test.ts`** - Do記法とResultChainクラスの使用方法
- **`zod-helpers.test.ts`** - Zod統合ヘルパーの使用例
- **`examples.test.ts`** - 実用的な使用例（ユーザー登録、ファイル処理、API呼び出し等）
- **`integration.test.ts`** - 複数機能を組み合わせた統合テスト

### テストの実行

```bash
# テスト実行
npm test

# ウォッチモードでテスト実行
npm run test:watch

# カバレッジ付きテスト実行
npm run test:coverage
```

### 実用例の学習

各テストファイルには詳細なコメントと実際のアプリケーションでの使用パターンが含まれています：

1. **ユーザー登録システム** (`examples.test.ts`) - バリデーション、非同期処理、エラーハンドリング
2. **ファイル処理システム** - ファイルサイズ検証、コンテンツ読み込み、チェックサム計算
3. **APIクライアント** - 設定検証、HTTP呼び出し、レスポンス解析
4. **データ変換パイプライン** - JSON解析、型変換、複合的なデータ処理

これらのテストを参照することで、Railway Oriented Programmingの実践的な使用方法を学ぶことができます。

## インストール

```bash
npm install @your-org/railway-result
```

## 基本的な使用方法

```typescript
import { Result, ok, err, isOk, isErr } from '@your-org/railway-result';

// 成功の場合
const success: Result<string, Error> = ok("Hello, World!");

// 失敗の場合
const failure: Result<string, Error> = err(new Error("Something went wrong"));

// 結果の確認
if (isOk(success)) {
  console.log(success.data); // "Hello, World!"
}

if (isErr(failure)) {
  console.log(failure.error.message); // "Something went wrong"
}
```

## Do記法を使用したチェーン処理

```typescript
import { Do, zodToResult } from '@your-org/railway-result';
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

async function processUser(input: unknown): Promise<Result<string, Error>> {
  return await Do(input)
    .map(UserSchema.safeParse)
    .map(parseResult => zodToResult(parseResult))
    .chain(user => ok(`Hello, ${user.name}!`))
    .run();
}
```

## API リファレンス

### 基本関数

- `ok<T>(value: T): Success<T>` - 成功結果を作成
- `err<E>(error: E): Failure<E>` - 失敗結果を作成
- `isOk<T, E>(result: Result<T, E>): result is Success<T>` - 成功かどうかを判定
- `isErr<T, E>(result: Result<T, E>): result is Failure<E>` - 失敗かどうかを判定

### ユーティリティ関数

- `fromPromise<T, E>(promise: Promise<T>): Promise<Result<T, E>>` - PromiseをResultに変換
- `toPromise<T, E>(result: Result<T, E>): Promise<T>` - ResultをPromiseに変換

### Do記法

- `Do<T, E>(initialValue: T): ResultChain<T, E>` - Do記法のチェーンを開始

### Zod統合

- `zodToResult<T>(zodResult): Result<T>` - ZodのSafeParseReturnTypeをResultに変換

## ライセンス

MIT
