import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { AuthService } from './application/auth/auth-service.js';
import { createApiApp } from './bootstrap/app.js';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaAuthRepository } from './infrastructure/persistence/prisma-auth-repository.js';
import { ScryptPasswordHasher } from './infrastructure/security/scrypt-password-hasher.js';
import { CareerGoalService } from './application/career/career-goal-service.js';
import { PrismaAuditLogger } from './infrastructure/persistence/prisma-audit-logger.js';
import { PrismaCareerGoalRepository } from './infrastructure/persistence/prisma-career-goal-repository.js';
import { SkillSettingsService } from './application/skill-settings/skill-settings-service.js';
import { PrismaSkillSettingsRepository } from './infrastructure/persistence/prisma-skill-settings-repository.js';
import { SkillService } from './application/skill/skill-service.js';
import { PrismaSkillRepository } from './infrastructure/persistence/prisma-skill-repository.js';
import { CareerSkillService } from './application/career-skill/career-skill-service.js';
import { PrismaCareerSkillRepository } from './infrastructure/persistence/prisma-career-skill-repository.js';
import { RoadmapItemService } from './application/roadmap/roadmap-item-service.js';
import { PrismaRoadmapItemRepository } from './infrastructure/persistence/prisma-roadmap-item-repository.js';

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
const careerGoalService = new CareerGoalService(
  new PrismaCareerGoalRepository(prisma),
  new PrismaAuditLogger(prisma),
);
const skillSettingsService = new SkillSettingsService(
  new PrismaSkillSettingsRepository(prisma),
  new PrismaAuditLogger(prisma),
);
const skillService = new SkillService(
  new PrismaSkillRepository(prisma),
  new PrismaAuditLogger(prisma),
);
const careerSkillService = new CareerSkillService(
  new PrismaCareerSkillRepository(prisma),
  new PrismaAuditLogger(prisma),
);
const roadmapItemService = new RoadmapItemService(
  new PrismaRoadmapItemRepository(prisma),
  new PrismaAuditLogger(prisma),
);
const app = createApiApp(
  authService,
  careerGoalService,
  skillSettingsService,
  skillService,
  careerSkillService,
  roadmapItemService,
);

app.listen(Number(process.env.API_PORT ?? 3001), () => {
  console.log('Career Growth Manager API started.');
});
