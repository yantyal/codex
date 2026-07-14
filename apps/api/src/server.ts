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
import { RoadmapDependencyService } from './application/roadmap/roadmap-dependency-service.js';
import { PrismaRoadmapDependencyRepository } from './infrastructure/persistence/prisma-roadmap-dependency-repository.js';
import { EvaluationPeriodService } from './application/evaluation/evaluation-period-service.js';
import { PrismaEvaluationPeriodRepository } from './infrastructure/persistence/prisma-evaluation-period-repository.js';
import { GoalService } from './application/goal/goal-service.js';
import { PrismaGoalRepository } from './infrastructure/persistence/prisma-goal-repository.js';
import { MilestoneService } from './application/milestone/milestone-service.js';
import { PrismaMilestoneRepository } from './infrastructure/persistence/prisma-milestone-repository.js';
import { DailyRecordService } from './application/daily-record/daily-record-service.js';
import { PrismaDailyRecordRepository } from './infrastructure/persistence/prisma-daily-record-repository.js';

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
const roadmapDependencyService = new RoadmapDependencyService(
  new PrismaRoadmapDependencyRepository(prisma),
  new PrismaAuditLogger(prisma),
);
const evaluationPeriodService = new EvaluationPeriodService(
  new PrismaEvaluationPeriodRepository(prisma),
  new PrismaAuditLogger(prisma),
);
const goalService = new GoalService(
  new PrismaGoalRepository(prisma),
  new PrismaAuditLogger(prisma),
);
const milestoneService = new MilestoneService(
  new PrismaMilestoneRepository(prisma),
  new PrismaAuditLogger(prisma),
);
const dailyRecordService = new DailyRecordService(
  new PrismaDailyRecordRepository(prisma),
  new PrismaAuditLogger(prisma),
);
const app = createApiApp(
  authService,
  careerGoalService,
  skillSettingsService,
  skillService,
  careerSkillService,
  roadmapItemService,
  roadmapDependencyService,
  evaluationPeriodService,
  goalService,
  milestoneService,
  dailyRecordService,
);

app.listen(Number(process.env.API_PORT ?? 3001), () => {
  console.log('Career Growth Manager API started.');
});
