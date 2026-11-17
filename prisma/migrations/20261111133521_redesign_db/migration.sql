/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `staff_user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "audit_log" ALTER COLUMN "tenant_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "customer_identity" ADD COLUMN     "password_hash" VARCHAR(255),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "staff_user" ADD COLUMN     "created_by_id" BIGINT,
ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_active_at" TIMESTAMPTZ(6),
ADD COLUMN     "last_login_at" TIMESTAMPTZ(6),
ADD COLUMN     "last_login_ip" VARCHAR(45),
ADD COLUMN     "locked_until" TIMESTAMPTZ(6),
ADD COLUMN     "mfa_secret" VARCHAR(255),
ADD COLUMN     "password_hash" VARCHAR(255),
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_by_id" BIGINT;

-- CreateTable
CREATE TABLE "staff_federated_identity" (
    "id" BIGSERIAL NOT NULL,
    "staff_user_id" BIGINT NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "profile_data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "staff_federated_identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_session" (
    "id" BIGSERIAL NOT NULL,
    "staff_user_id" BIGINT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_submission" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT,
    "staff_user_id" BIGINT,
    "customer_profile_id" BIGINT,
    "kyc_type" VARCHAR(30) NOT NULL DEFAULT 'STAFF',
    "id_type" VARCHAR(50) NOT NULL,
    "id_number_encrypted" TEXT,
    "id_number_masked" VARCHAR(50),
    "document_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by_id" BIGINT,
    "verification_metadata" JSONB,
    "expiry_date" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_federated_identity" (
    "id" BIGSERIAL NOT NULL,
    "identity_id" BIGINT NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "profile_data" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_federated_identity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_federated_identity_staff_user_id_idx" ON "staff_federated_identity"("staff_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_federated_identity_provider_provider_user_id_key" ON "staff_federated_identity"("provider", "provider_user_id");

-- CreateIndex
CREATE INDEX "staff_session_staff_user_id_idx" ON "staff_session"("staff_user_id");

-- CreateIndex
CREATE INDEX "kyc_submission_tenant_id_idx" ON "kyc_submission"("tenant_id");

-- CreateIndex
CREATE INDEX "kyc_submission_staff_user_id_idx" ON "kyc_submission"("staff_user_id");

-- CreateIndex
CREATE INDEX "kyc_submission_customer_profile_id_idx" ON "kyc_submission"("customer_profile_id");

-- CreateIndex
CREATE INDEX "kyc_submission_reviewed_by_id_idx" ON "kyc_submission"("reviewed_by_id");

-- CreateIndex
CREATE INDEX "kyc_submission_status_idx" ON "kyc_submission"("status");

-- CreateIndex
CREATE INDEX "kyc_submission_kyc_type_idx" ON "kyc_submission"("kyc_type");

-- CreateIndex
CREATE INDEX "customer_federated_identity_identity_id_idx" ON "customer_federated_identity"("identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_federated_identity_provider_provider_user_id_key" ON "customer_federated_identity"("provider", "provider_user_id");

-- CreateIndex
CREATE INDEX "audit_log_tenant_id_idx" ON "audit_log"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_idx" ON "audit_log"("actor_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_user_email_key" ON "staff_user"("email");

-- CreateIndex
CREATE INDEX "staff_user_created_by_id_idx" ON "staff_user"("created_by_id");

-- CreateIndex
CREATE INDEX "staff_user_updated_by_id_idx" ON "staff_user"("updated_by_id");

-- AddForeignKey
ALTER TABLE "staff_user" ADD CONSTRAINT "staff_user_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "staff_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_user" ADD CONSTRAINT "staff_user_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "staff_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_federated_identity" ADD CONSTRAINT "staff_federated_identity_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_session" ADD CONSTRAINT "staff_session_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submission" ADD CONSTRAINT "kyc_submission_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submission" ADD CONSTRAINT "kyc_submission_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submission" ADD CONSTRAINT "kyc_submission_customer_profile_id_fkey" FOREIGN KEY ("customer_profile_id") REFERENCES "customer_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submission" ADD CONSTRAINT "kyc_submission_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "staff_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_federated_identity" ADD CONSTRAINT "customer_federated_identity_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "customer_identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
