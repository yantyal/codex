import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // クライアント生成や静的検証ではDBへ接続しないため、CI用の形式上のURLを使用する。
    url:
      process.env.DATABASE_URL ??
      'mysql://career_growth:not-used@localhost:3306/career_growth',
  },
});
