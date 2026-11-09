export * from './lib/prisma.module';
export * from './lib/prisma.service';
// Namespace do client gerado (ex.: Prisma.PrismaClientKnownRequestError para traduzir erros na infra).
export { Prisma } from './generated/prisma/client';
