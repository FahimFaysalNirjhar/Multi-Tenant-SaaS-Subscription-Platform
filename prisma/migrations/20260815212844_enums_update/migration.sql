/*
  Warnings:

  - The values [PLATFORM_ADMIN] on the enum `PlatformRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlatformRole_new" AS ENUM ('ADMIN', 'USER');
ALTER TABLE "public"."user" ALTER COLUMN "platformRole" DROP DEFAULT;
ALTER TABLE "user" ALTER COLUMN "platformRole" TYPE "PlatformRole_new" USING ("platformRole"::text::"PlatformRole_new");
ALTER TYPE "PlatformRole" RENAME TO "PlatformRole_old";
ALTER TYPE "PlatformRole_new" RENAME TO "PlatformRole";
DROP TYPE "public"."PlatformRole_old";
ALTER TABLE "user" ALTER COLUMN "platformRole" SET DEFAULT 'USER';
COMMIT;
