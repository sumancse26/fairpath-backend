-- DropForeignKey
ALTER TABLE "lookup_value" DROP CONSTRAINT "lookup_value_lookup_type_id_fkey";

-- DropForeignKey
ALTER TABLE "lookup_value" DROP CONSTRAINT "lookup_value_product_type_id_fkey";

-- DropIndex
DROP INDEX "audit_log_entity_type_entity_id_idx";

-- DropIndex
DROP INDEX "customer_federated_identity_provider_provider_user_id_key";

-- DropIndex
DROP INDEX "kyc_submission_kyc_type_idx";

-- DropIndex
DROP INDEX "kyc_submission_status_idx";

-- DropIndex
DROP INDEX "staff_federated_identity_provider_provider_user_id_key";

-- AlterTable
ALTER TABLE "agent" DROP COLUMN "status",
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "allocation_event" DROP COLUMN "from_pool",
DROP COLUMN "to_pool",
ADD COLUMN     "from_pool_id" BIGINT NOT NULL,
ADD COLUMN     "to_pool_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "allocation_rule" DROP COLUMN "allocation_mode",
DROP COLUMN "pool_code",
DROP COLUMN "quota_units",
DROP COLUMN "release_to_pool",
DROP COLUMN "scope_type",
ADD COLUMN     "allocation_mode_id" BIGINT NOT NULL,
ADD COLUMN     "pool_id" BIGINT NOT NULL,
ADD COLUMN     "quota_unit_ids" BIGINT[] DEFAULT ARRAY[]::BIGINT[],
ADD COLUMN     "release_to_pool_id" BIGINT,
ADD COLUMN     "scope_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "ancillary_offer" DROP COLUMN "currency",
DROP COLUMN "scope_type",
ADD COLUMN     "currency_id" BIGINT NOT NULL,
ADD COLUMN     "scope_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "ancillary_product" DROP COLUMN "category",
ADD COLUMN     "category_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "api_key" DROP COLUMN "key_type",
DROP COLUMN "scopes",
ADD COLUMN     "key_type_id" BIGINT NOT NULL,
ADD COLUMN     "scope_ids" BIGINT[] DEFAULT ARRAY[]::BIGINT[];

-- AlterTable
ALTER TABLE "approval_request" DROP COLUMN "action_type",
DROP COLUMN "status",
ADD COLUMN     "action_type_id" BIGINT NOT NULL,
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "attribute_definition" DROP COLUMN "data_type",
DROP COLUMN "entity_type",
DROP COLUMN "visibility",
ADD COLUMN     "data_type_id" BIGINT NOT NULL,
ADD COLUMN     "entity_type_id" BIGINT NOT NULL,
ADD COLUMN     "visibility_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "audit_log" DROP COLUMN "action",
DROP COLUMN "actor_type",
DROP COLUMN "entity_type",
ADD COLUMN     "action_id" BIGINT NOT NULL,
ADD COLUMN     "actor_type_id" BIGINT NOT NULL,
ADD COLUMN     "entity_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "booking" DROP COLUMN "currency",
DROP COLUMN "sales_channel",
DROP COLUMN "status",
ADD COLUMN     "currency_id" BIGINT NOT NULL,
ADD COLUMN     "sales_channel_id" BIGINT NOT NULL,
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "booking_item" DROP COLUMN "item_type",
DROP COLUMN "status",
ADD COLUMN     "item_type_id" BIGINT NOT NULL,
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "booking_price_line" DROP COLUMN "component_type",
ADD COLUMN     "component_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "crew_document" DROP COLUMN "doc_type",
ADD COLUMN     "doc_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "crew_leave" DROP COLUMN "leave_type",
DROP COLUMN "status",
ADD COLUMN     "leave_type_id" BIGINT NOT NULL,
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "crew_member" DROP COLUMN "employment_type",
DROP COLUMN "status",
ADD COLUMN     "employment_type_id" BIGINT NOT NULL,
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "crew_member_role" DROP CONSTRAINT "crew_member_role_pkey",
DROP COLUMN "crew_role_code",
ADD COLUMN     "crew_role_id" BIGINT NOT NULL,
ADD CONSTRAINT "crew_member_role_pkey" PRIMARY KEY ("crew_member_id", "crew_role_id");

-- AlterTable
ALTER TABLE "crew_requirement" DROP COLUMN "crew_role_code",
ADD COLUMN     "crew_role_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "currency" DROP CONSTRAINT "currency_pkey",
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "currency_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "customer_federated_identity" DROP COLUMN "provider",
ADD COLUMN     "provider_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "exchange_rate" DROP COLUMN "from_code",
DROP COLUMN "to_code",
ADD COLUMN     "from_currency_id" BIGINT NOT NULL,
ADD COLUMN     "to_currency_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "external_mapping" DROP COLUMN "entity_type",
ADD COLUMN     "entity_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "fare_rule" DROP COLUMN "component_type",
DROP COLUMN "currency",
ADD COLUMN     "component_type_id" BIGINT NOT NULL,
ADD COLUMN     "currency_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "hold" DROP COLUMN "channel_code",
DROP COLUMN "status",
ADD COLUMN     "channel_id" BIGINT NOT NULL,
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "hold_item" DROP COLUMN "currency",
ADD COLUMN     "currency_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "integration_log" DROP COLUMN "direction",
ADD COLUMN     "direction_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "kyc_submission" DROP COLUMN "id_type",
DROP COLUMN "kyc_type",
DROP COLUMN "status",
ADD COLUMN     "id_type_id" BIGINT NOT NULL,
ADD COLUMN     "kyc_type_id" BIGINT NOT NULL,
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "layout_cell" DROP COLUMN "cell_type_code",
DROP COLUMN "flags",
DROP COLUMN "position_code",
DROP COLUMN "price_tier",
DROP COLUMN "sell_mode",
DROP COLUMN "unit_type_code",
ADD COLUMN     "cell_type_id" BIGINT NOT NULL,
ADD COLUMN     "flag_ids" BIGINT[] DEFAULT ARRAY[]::BIGINT[],
ADD COLUMN     "position_id" BIGINT NOT NULL,
ADD COLUMN     "price_tier_id" BIGINT NOT NULL,
ADD COLUMN     "sell_mode_id" BIGINT NOT NULL,
ADD COLUMN     "unit_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "layout_template" DROP COLUMN "status",
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "ledger_entry" DROP COLUMN "account_code",
DROP COLUMN "currency",
DROP COLUMN "ref_type",
ADD COLUMN     "account_id" BIGINT NOT NULL,
ADD COLUMN     "currency_id" BIGINT NOT NULL,
ADD COLUMN     "ref_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "location" DROP COLUMN "location_type",
DROP COLUMN "timezone",
ADD COLUMN     "location_type_id" BIGINT NOT NULL,
ADD COLUMN     "timezone_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "membership" DROP COLUMN "status",
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "notification_log" DROP COLUMN "channel",
DROP COLUMN "status",
ADD COLUMN     "channel_id" BIGINT NOT NULL,
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "offering" DROP COLUMN "selection_mode",
ADD COLUMN     "selection_mode_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "outbox_event" DROP COLUMN "event_type",
DROP COLUMN "status",
DROP COLUMN "topic",
ADD COLUMN     "event_type_id" BIGINT NOT NULL,
ADD COLUMN     "status_id" BIGINT NOT NULL,
ADD COLUMN     "topic_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "payment" DROP COLUMN "currency",
DROP COLUMN "gateway_provider",
DROP COLUMN "payment_method",
DROP COLUMN "status",
ADD COLUMN     "currency_id" BIGINT NOT NULL,
ADD COLUMN     "gateway_provider_id" BIGINT NOT NULL,
ADD COLUMN     "payment_method_id" BIGINT NOT NULL,
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "policy_definition" DROP COLUMN "allowed_scopes",
DROP COLUMN "value_type",
ADD COLUMN     "allowed_scope_ids" BIGINT[] DEFAULT ARRAY[]::BIGINT[],
ADD COLUMN     "value_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "product_type" DROP COLUMN "inventory_model",
ADD COLUMN     "inventory_model_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "promo" DROP COLUMN "discount_type",
ADD COLUMN     "discount_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "refund" DROP COLUMN "status",
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "resource" DROP COLUMN "status",
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "resource_crew" DROP COLUMN "crew_role_code",
ADD COLUMN     "crew_role_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "resource_document" DROP COLUMN "doc_type_code",
ADD COLUMN     "doc_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "rule" DROP COLUMN "rule_type",
DROP COLUMN "scope_type",
ADD COLUMN     "rule_type_id" BIGINT NOT NULL,
ADD COLUMN     "scope_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "saved_traveler" DROP COLUMN "gender",
DROP COLUMN "nationality",
DROP COLUMN "traveler_type",
ADD COLUMN     "gender_id" BIGINT NOT NULL,
ADD COLUMN     "nationality_id" BIGINT NOT NULL,
ADD COLUMN     "traveler_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "saved_traveler_document" DROP COLUMN "country_code",
DROP COLUMN "doc_type_code",
ADD COLUMN     "country_id" BIGINT NOT NULL,
ADD COLUMN     "doc_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "service_line" DROP COLUMN "status",
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "settlement" DROP COLUMN "status",
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "staff_federated_identity" DROP COLUMN "provider",
ADD COLUMN     "provider_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "staff_session" ADD COLUMN     "tenant_id" BIGINT;

-- AlterTable
ALTER TABLE "staff_user" DROP COLUMN "status",
ADD COLUMN     "status_id" BIGINT NOT NULL,
ADD COLUMN     "tenant_id" BIGINT;

-- AlterTable
ALTER TABLE "supplier_connection" DROP COLUMN "auth_type",
DROP COLUMN "status",
DROP COLUMN "supply_mode",
ADD COLUMN     "auth_type_id" BIGINT NOT NULL,
ADD COLUMN     "status_id" BIGINT NOT NULL,
ADD COLUMN     "supply_mode_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "template" DROP COLUMN "event_code",
DROP COLUMN "locale",
DROP COLUMN "template_type",
ADD COLUMN     "event_type_id" BIGINT NOT NULL,
ADD COLUMN     "locale_id" BIGINT NOT NULL,
ADD COLUMN     "template_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "tenant" DROP COLUMN "payment_model",
DROP COLUMN "status",
ADD COLUMN     "payment_model_id" BIGINT NOT NULL,
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "tenant_setting" DROP COLUMN "scope_type",
ADD COLUMN     "scope_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "ticket" DROP COLUMN "status",
ADD COLUMN     "status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "traveler" DROP COLUMN "gender",
DROP COLUMN "nationality",
DROP COLUMN "type",
ADD COLUMN     "gender_id" BIGINT NOT NULL,
ADD COLUMN     "nationality_id" BIGINT NOT NULL,
ADD COLUMN     "type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "traveler_document" DROP COLUMN "country",
DROP COLUMN "doc_type",
ADD COLUMN     "country_id" BIGINT NOT NULL,
ADD COLUMN     "doc_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "trip" DROP COLUMN "status",
DROP COLUMN "supply_mode",
ADD COLUMN     "status_id" BIGINT NOT NULL,
ADD COLUMN     "supply_mode_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "trip_change" DROP COLUMN "change_type",
ADD COLUMN     "change_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "trip_crew" DROP COLUMN "crew_role_code",
DROP COLUMN "duty_status",
ADD COLUMN     "crew_role_id" BIGINT NOT NULL,
ADD COLUMN     "duty_status_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "trip_unit" DROP COLUMN "cell_type_code",
DROP COLUMN "currency",
DROP COLUMN "eligibility_lock",
DROP COLUMN "pool_code",
DROP COLUMN "status",
DROP COLUMN "unit_type_code",
ADD COLUMN     "cell_type_id" BIGINT NOT NULL,
ADD COLUMN     "currency_id" BIGINT NOT NULL,
ADD COLUMN     "eligibility_lock_id" BIGINT,
ADD COLUMN     "pool_id" BIGINT NOT NULL,
ADD COLUMN     "status_id" BIGINT NOT NULL,
ADD COLUMN     "unit_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "unit_span" DROP COLUMN "span_type",
ADD COLUMN     "span_type_id" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "webhook_endpoint" DROP COLUMN "event_types",
ADD COLUMN     "event_type_ids" BIGINT[] DEFAULT ARRAY[]::BIGINT[];

-- AlterTable
ALTER TABLE "workflow_status" DROP CONSTRAINT "workflow_status_pkey",
DROP COLUMN "code",
DROP COLUMN "label",
ADD COLUMN     "status_id" BIGINT NOT NULL,
ADD CONSTRAINT "workflow_status_pkey" PRIMARY KEY ("workflow_id", "status_id");

-- AlterTable
ALTER TABLE "workflow_transition" DROP CONSTRAINT "workflow_transition_pkey",
DROP COLUMN "from_code",
DROP COLUMN "required_permission",
DROP COLUMN "to_code",
ADD COLUMN     "from_status_id" BIGINT NOT NULL,
ADD COLUMN     "required_permission_id" BIGINT NOT NULL,
ADD COLUMN     "to_status_id" BIGINT NOT NULL,
ADD CONSTRAINT "workflow_transition_pkey" PRIMARY KEY ("workflow_id", "from_status_id", "to_status_id");

-- DropTable
DROP TABLE "lookup_type";

-- DropTable
DROP TABLE "lookup_value";

-- CreateTable
CREATE TABLE "lookup_mst" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lookup_mst_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lookup_dtl" (
    "id" BIGSERIAL NOT NULL,
    "lookup_mst_id" BIGINT NOT NULL,
    "product_type_id" BIGINT,
    "code" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lookup_dtl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lookup_mst_code_key" ON "lookup_mst"("code");

-- CreateIndex
CREATE INDEX "lookup_dtl_lookup_mst_id_idx" ON "lookup_dtl"("lookup_mst_id");

-- CreateIndex
CREATE INDEX "lookup_dtl_product_type_id_idx" ON "lookup_dtl"("product_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "lookup_dtl_lookup_mst_id_product_type_id_code_key" ON "lookup_dtl"("lookup_mst_id", "product_type_id", "code");

-- CreateIndex
CREATE INDEX "agent_status_id_idx" ON "agent"("status_id");

-- CreateIndex
CREATE INDEX "allocation_rule_pool_id_idx" ON "allocation_rule"("pool_id");

-- CreateIndex
CREATE INDEX "ancillary_offer_scope_type_id_idx" ON "ancillary_offer"("scope_type_id");

-- CreateIndex
CREATE INDEX "ancillary_offer_currency_id_idx" ON "ancillary_offer"("currency_id");

-- CreateIndex
CREATE INDEX "ancillary_product_category_id_idx" ON "ancillary_product"("category_id");

-- CreateIndex
CREATE INDEX "approval_request_status_id_idx" ON "approval_request"("status_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_id_entity_id_idx" ON "audit_log"("entity_type_id", "entity_id");

-- CreateIndex
CREATE INDEX "booking_status_id_idx" ON "booking"("status_id");

-- CreateIndex
CREATE INDEX "booking_sales_channel_id_idx" ON "booking"("sales_channel_id");

-- CreateIndex
CREATE INDEX "booking_currency_id_idx" ON "booking"("currency_id");

-- CreateIndex
CREATE INDEX "booking_item_status_id_idx" ON "booking_item"("status_id");

-- CreateIndex
CREATE INDEX "booking_price_line_component_type_id_idx" ON "booking_price_line"("component_type_id");

-- CreateIndex
CREATE INDEX "crew_document_doc_type_id_idx" ON "crew_document"("doc_type_id");

-- CreateIndex
CREATE INDEX "crew_leave_status_id_idx" ON "crew_leave"("status_id");

-- CreateIndex
CREATE INDEX "crew_member_status_id_idx" ON "crew_member"("status_id");

-- CreateIndex
CREATE INDEX "crew_member_role_crew_role_id_idx" ON "crew_member_role"("crew_role_id");

-- CreateIndex
CREATE INDEX "crew_requirement_crew_role_id_idx" ON "crew_requirement"("crew_role_id");

-- CreateIndex
CREATE UNIQUE INDEX "currency_code_key" ON "currency"("code");

-- CreateIndex
CREATE UNIQUE INDEX "customer_federated_identity_provider_id_provider_user_id_key" ON "customer_federated_identity"("provider_id", "provider_user_id");

-- CreateIndex
CREATE INDEX "exchange_rate_from_currency_id_idx" ON "exchange_rate"("from_currency_id");

-- CreateIndex
CREATE INDEX "exchange_rate_to_currency_id_idx" ON "exchange_rate"("to_currency_id");

-- CreateIndex
CREATE INDEX "external_mapping_entity_type_id_idx" ON "external_mapping"("entity_type_id");

-- CreateIndex
CREATE INDEX "fare_rule_component_type_id_idx" ON "fare_rule"("component_type_id");

-- CreateIndex
CREATE INDEX "fare_rule_currency_id_idx" ON "fare_rule"("currency_id");

-- CreateIndex
CREATE INDEX "hold_status_id_idx" ON "hold"("status_id");

-- CreateIndex
CREATE INDEX "hold_item_currency_id_idx" ON "hold_item"("currency_id");

-- CreateIndex
CREATE INDEX "integration_log_direction_id_idx" ON "integration_log"("direction_id");

-- CreateIndex
CREATE INDEX "kyc_submission_status_id_idx" ON "kyc_submission"("status_id");

-- CreateIndex
CREATE INDEX "kyc_submission_kyc_type_id_idx" ON "kyc_submission"("kyc_type_id");

-- CreateIndex
CREATE INDEX "layout_template_status_id_idx" ON "layout_template"("status_id");

-- CreateIndex
CREATE INDEX "ledger_entry_account_id_idx" ON "ledger_entry"("account_id");

-- CreateIndex
CREATE INDEX "ledger_entry_currency_id_idx" ON "ledger_entry"("currency_id");

-- CreateIndex
CREATE INDEX "ledger_entry_ref_type_id_ref_id_idx" ON "ledger_entry"("ref_type_id", "ref_id");

-- CreateIndex
CREATE INDEX "location_location_type_id_idx" ON "location"("location_type_id");

-- CreateIndex
CREATE INDEX "location_timezone_id_idx" ON "location"("timezone_id");

-- CreateIndex
CREATE INDEX "membership_status_id_idx" ON "membership"("status_id");

-- CreateIndex
CREATE INDEX "notification_log_channel_id_idx" ON "notification_log"("channel_id");

-- CreateIndex
CREATE INDEX "notification_log_status_id_idx" ON "notification_log"("status_id");

-- CreateIndex
CREATE INDEX "offering_selection_mode_id_idx" ON "offering"("selection_mode_id");

-- CreateIndex
CREATE INDEX "outbox_event_status_id_idx" ON "outbox_event"("status_id");

-- CreateIndex
CREATE INDEX "payment_status_id_idx" ON "payment"("status_id");

-- CreateIndex
CREATE INDEX "payment_payment_method_id_idx" ON "payment"("payment_method_id");

-- CreateIndex
CREATE INDEX "payment_currency_id_idx" ON "payment"("currency_id");

-- CreateIndex
CREATE INDEX "product_type_inventory_model_id_idx" ON "product_type"("inventory_model_id");

-- CreateIndex
CREATE INDEX "promo_discount_type_id_idx" ON "promo"("discount_type_id");

-- CreateIndex
CREATE INDEX "refund_status_id_idx" ON "refund"("status_id");

-- CreateIndex
CREATE INDEX "resource_status_id_idx" ON "resource"("status_id");

-- CreateIndex
CREATE INDEX "resource_crew_crew_role_id_idx" ON "resource_crew"("crew_role_id");

-- CreateIndex
CREATE INDEX "resource_document_doc_type_id_idx" ON "resource_document"("doc_type_id");

-- CreateIndex
CREATE INDEX "rule_rule_type_id_idx" ON "rule"("rule_type_id");

-- CreateIndex
CREATE INDEX "rule_scope_type_id_idx" ON "rule"("scope_type_id");

-- CreateIndex
CREATE INDEX "service_line_status_id_idx" ON "service_line"("status_id");

-- CreateIndex
CREATE INDEX "settlement_status_id_idx" ON "settlement"("status_id");

-- CreateIndex
CREATE UNIQUE INDEX "staff_federated_identity_provider_id_provider_user_id_key" ON "staff_federated_identity"("provider_id", "provider_user_id");

-- CreateIndex
CREATE INDEX "staff_session_tenant_id_idx" ON "staff_session"("tenant_id");

-- CreateIndex
CREATE INDEX "staff_user_tenant_id_idx" ON "staff_user"("tenant_id");

-- CreateIndex
CREATE INDEX "staff_user_status_id_idx" ON "staff_user"("status_id");

-- CreateIndex
CREATE INDEX "supplier_connection_status_id_idx" ON "supplier_connection"("status_id");

-- CreateIndex
CREATE INDEX "tenant_status_id_idx" ON "tenant"("status_id");

-- CreateIndex
CREATE INDEX "tenant_payment_model_id_idx" ON "tenant"("payment_model_id");

-- CreateIndex
CREATE INDEX "tenant_setting_scope_type_id_idx" ON "tenant_setting"("scope_type_id");

-- CreateIndex
CREATE INDEX "ticket_status_id_idx" ON "ticket"("status_id");

-- CreateIndex
CREATE INDEX "trip_status_id_idx" ON "trip"("status_id");

-- CreateIndex
CREATE INDEX "trip_change_change_type_id_idx" ON "trip_change"("change_type_id");

-- CreateIndex
CREATE INDEX "trip_crew_crew_role_id_idx" ON "trip_crew"("crew_role_id");

-- CreateIndex
CREATE INDEX "trip_crew_duty_status_id_idx" ON "trip_crew"("duty_status_id");

-- CreateIndex
CREATE INDEX "trip_unit_status_id_idx" ON "trip_unit"("status_id");

-- CreateIndex
CREATE INDEX "trip_unit_pool_id_idx" ON "trip_unit"("pool_id");

-- CreateIndex
CREATE INDEX "trip_unit_currency_id_idx" ON "trip_unit"("currency_id");

-- CreateIndex
CREATE INDEX "unit_span_span_type_id_idx" ON "unit_span"("span_type_id");

-- CreateIndex
CREATE INDEX "workflow_status_status_id_idx" ON "workflow_status"("status_id");

-- CreateIndex
CREATE INDEX "workflow_transition_from_status_id_idx" ON "workflow_transition"("from_status_id");

-- CreateIndex
CREATE INDEX "workflow_transition_to_status_id_idx" ON "workflow_transition"("to_status_id");

-- CreateIndex
CREATE INDEX "workflow_transition_required_permission_id_idx" ON "workflow_transition"("required_permission_id");

-- AddForeignKey
ALTER TABLE "tenant" ADD CONSTRAINT "tenant_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant" ADD CONSTRAINT "tenant_payment_model_id_fkey" FOREIGN KEY ("payment_model_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent" ADD CONSTRAINT "agent_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_setting" ADD CONSTRAINT "tenant_setting_scope_type_id_fkey" FOREIGN KEY ("scope_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_user" ADD CONSTRAINT "staff_user_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_user" ADD CONSTRAINT "staff_user_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_federated_identity" ADD CONSTRAINT "staff_federated_identity_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_session" ADD CONSTRAINT "staff_session_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submission" ADD CONSTRAINT "kyc_submission_kyc_type_id_fkey" FOREIGN KEY ("kyc_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submission" ADD CONSTRAINT "kyc_submission_id_type_id_fkey" FOREIGN KEY ("id_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submission" ADD CONSTRAINT "kyc_submission_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_action_type_id_fkey" FOREIGN KEY ("action_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_type_id_fkey" FOREIGN KEY ("actor_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_action_id_fkey" FOREIGN KEY ("action_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_entity_type_id_fkey" FOREIGN KEY ("entity_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_federated_identity" ADD CONSTRAINT "customer_federated_identity_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_traveler" ADD CONSTRAINT "saved_traveler_gender_id_fkey" FOREIGN KEY ("gender_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_traveler" ADD CONSTRAINT "saved_traveler_nationality_id_fkey" FOREIGN KEY ("nationality_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_traveler" ADD CONSTRAINT "saved_traveler_traveler_type_id_fkey" FOREIGN KEY ("traveler_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_traveler_document" ADD CONSTRAINT "saved_traveler_document_doc_type_id_fkey" FOREIGN KEY ("doc_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_traveler_document" ADD CONSTRAINT "saved_traveler_document_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_key_type_id_fkey" FOREIGN KEY ("key_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_event" ADD CONSTRAINT "outbox_event_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_event" ADD CONSTRAINT "outbox_event_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_event" ADD CONSTRAINT "outbox_event_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lookup_dtl" ADD CONSTRAINT "lookup_dtl_lookup_mst_id_fkey" FOREIGN KEY ("lookup_mst_id") REFERENCES "lookup_mst"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lookup_dtl" ADD CONSTRAINT "lookup_dtl_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_type" ADD CONSTRAINT "product_type_inventory_model_id_fkey" FOREIGN KEY ("inventory_model_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_definition" ADD CONSTRAINT "attribute_definition_entity_type_id_fkey" FOREIGN KEY ("entity_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_definition" ADD CONSTRAINT "attribute_definition_data_type_id_fkey" FOREIGN KEY ("data_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_definition" ADD CONSTRAINT "attribute_definition_visibility_id_fkey" FOREIGN KEY ("visibility_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_definition" ADD CONSTRAINT "policy_definition_value_type_id_fkey" FOREIGN KEY ("value_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_status" ADD CONSTRAINT "workflow_status_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transition" ADD CONSTRAINT "workflow_transition_from_status_id_fkey" FOREIGN KEY ("from_status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transition" ADD CONSTRAINT "workflow_transition_to_status_id_fkey" FOREIGN KEY ("to_status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transition" ADD CONSTRAINT "workflow_transition_required_permission_id_fkey" FOREIGN KEY ("required_permission_id") REFERENCES "permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule" ADD CONSTRAINT "rule_rule_type_id_fkey" FOREIGN KEY ("rule_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule" ADD CONSTRAINT "rule_scope_type_id_fkey" FOREIGN KEY ("scope_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_template_type_id_fkey" FOREIGN KEY ("template_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_locale_id_fkey" FOREIGN KEY ("locale_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rate" ADD CONSTRAINT "exchange_rate_from_currency_id_fkey" FOREIGN KEY ("from_currency_id") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rate" ADD CONSTRAINT "exchange_rate_to_currency_id_fkey" FOREIGN KEY ("to_currency_id") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_location_type_id_fkey" FOREIGN KEY ("location_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_timezone_id_fkey" FOREIGN KEY ("timezone_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offering" ADD CONSTRAINT "offering_selection_mode_id_fkey" FOREIGN KEY ("selection_mode_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_template" ADD CONSTRAINT "layout_template_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_cell" ADD CONSTRAINT "layout_cell_cell_type_id_fkey" FOREIGN KEY ("cell_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_cell" ADD CONSTRAINT "layout_cell_unit_type_id_fkey" FOREIGN KEY ("unit_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_cell" ADD CONSTRAINT "layout_cell_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_cell" ADD CONSTRAINT "layout_cell_price_tier_id_fkey" FOREIGN KEY ("price_tier_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_cell" ADD CONSTRAINT "layout_cell_sell_mode_id_fkey" FOREIGN KEY ("sell_mode_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_document" ADD CONSTRAINT "resource_document_doc_type_id_fkey" FOREIGN KEY ("doc_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_line" ADD CONSTRAINT "service_line_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fare_rule" ADD CONSTRAINT "fare_rule_component_type_id_fkey" FOREIGN KEY ("component_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fare_rule" ADD CONSTRAINT "fare_rule_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ancillary_product" ADD CONSTRAINT "ancillary_product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ancillary_offer" ADD CONSTRAINT "ancillary_offer_scope_type_id_fkey" FOREIGN KEY ("scope_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ancillary_offer" ADD CONSTRAINT "ancillary_offer_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_supply_mode_id_fkey" FOREIGN KEY ("supply_mode_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_unit" ADD CONSTRAINT "trip_unit_cell_type_id_fkey" FOREIGN KEY ("cell_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_unit" ADD CONSTRAINT "trip_unit_unit_type_id_fkey" FOREIGN KEY ("unit_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_unit" ADD CONSTRAINT "trip_unit_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_unit" ADD CONSTRAINT "trip_unit_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_unit" ADD CONSTRAINT "trip_unit_eligibility_lock_id_fkey" FOREIGN KEY ("eligibility_lock_id") REFERENCES "lookup_dtl"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_unit" ADD CONSTRAINT "trip_unit_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_span" ADD CONSTRAINT "unit_span_span_type_id_fkey" FOREIGN KEY ("span_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hold" ADD CONSTRAINT "hold_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hold" ADD CONSTRAINT "hold_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hold_item" ADD CONSTRAINT "hold_item_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_rule" ADD CONSTRAINT "allocation_rule_scope_type_id_fkey" FOREIGN KEY ("scope_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_rule" ADD CONSTRAINT "allocation_rule_pool_id_fkey" FOREIGN KEY ("pool_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_rule" ADD CONSTRAINT "allocation_rule_allocation_mode_id_fkey" FOREIGN KEY ("allocation_mode_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_rule" ADD CONSTRAINT "allocation_rule_release_to_pool_id_fkey" FOREIGN KEY ("release_to_pool_id") REFERENCES "lookup_dtl"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_event" ADD CONSTRAINT "allocation_event_from_pool_id_fkey" FOREIGN KEY ("from_pool_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_event" ADD CONSTRAINT "allocation_event_to_pool_id_fkey" FOREIGN KEY ("to_pool_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_change" ADD CONSTRAINT "trip_change_change_type_id_fkey" FOREIGN KEY ("change_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_sales_channel_id_fkey" FOREIGN KEY ("sales_channel_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler" ADD CONSTRAINT "traveler_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler" ADD CONSTRAINT "traveler_gender_id_fkey" FOREIGN KEY ("gender_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler" ADD CONSTRAINT "traveler_nationality_id_fkey" FOREIGN KEY ("nationality_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler_document" ADD CONSTRAINT "traveler_document_doc_type_id_fkey" FOREIGN KEY ("doc_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler_document" ADD CONSTRAINT "traveler_document_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_item" ADD CONSTRAINT "booking_item_item_type_id_fkey" FOREIGN KEY ("item_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_item" ADD CONSTRAINT "booking_item_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_price_line" ADD CONSTRAINT "booking_price_line_component_type_id_fkey" FOREIGN KEY ("component_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_gateway_provider_id_fkey" FOREIGN KEY ("gateway_provider_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo" ADD CONSTRAINT "promo_discount_type_id_fkey" FOREIGN KEY ("discount_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_ref_type_id_fkey" FOREIGN KEY ("ref_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_connection" ADD CONSTRAINT "supplier_connection_supply_mode_id_fkey" FOREIGN KEY ("supply_mode_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_connection" ADD CONSTRAINT "supplier_connection_auth_type_id_fkey" FOREIGN KEY ("auth_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_connection" ADD CONSTRAINT "supplier_connection_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_mapping" ADD CONSTRAINT "external_mapping_entity_type_id_fkey" FOREIGN KEY ("entity_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_log" ADD CONSTRAINT "integration_log_direction_id_fkey" FOREIGN KEY ("direction_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_member" ADD CONSTRAINT "crew_member_employment_type_id_fkey" FOREIGN KEY ("employment_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_member" ADD CONSTRAINT "crew_member_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_member_role" ADD CONSTRAINT "crew_member_role_crew_role_id_fkey" FOREIGN KEY ("crew_role_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_document" ADD CONSTRAINT "crew_document_doc_type_id_fkey" FOREIGN KEY ("doc_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_leave" ADD CONSTRAINT "crew_leave_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_leave" ADD CONSTRAINT "crew_leave_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_requirement" ADD CONSTRAINT "crew_requirement_crew_role_id_fkey" FOREIGN KEY ("crew_role_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_crew" ADD CONSTRAINT "resource_crew_crew_role_id_fkey" FOREIGN KEY ("crew_role_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_crew" ADD CONSTRAINT "trip_crew_crew_role_id_fkey" FOREIGN KEY ("crew_role_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_crew" ADD CONSTRAINT "trip_crew_duty_status_id_fkey" FOREIGN KEY ("duty_status_id") REFERENCES "lookup_dtl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

