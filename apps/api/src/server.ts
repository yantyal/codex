import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { AuthService } from './application/auth/auth-service.js';
import { createApiApp } from './bootstrap/app.js';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaAuthRepository } from './infrastructure/persistence/prisma-auth-repository.js';
import { ScryptPasswordHasher } from './infrastructure/security/scrypt-password-hasher.js';

const databaseUrl = new URL(process.env.DATABASE_URL ?? '');
const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseUrl.pathname.slice(1),
});
const prisma = new PrismaClient({ adapter });
const authService = new AuthService(
  new PrismaAuthRepository(prisma),
  new ScryptPasswordHasher(),
);
const app = createApiApp(authService);

app.listen(Number(process.env.API_PORT ?? 3001), () => {
  console.log('Career Growth Manager API started.');
});
