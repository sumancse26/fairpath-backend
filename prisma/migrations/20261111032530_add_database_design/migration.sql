-- CreateTable
CREATE TABLE "tenant" (
    "id" BIGSERIAL NOT NULL,
    "plan_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "payment_model" VARCHAR(30) NOT NULL,
    "domain" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_product_type" (
    "tenant_id" BIGINT NOT NULL,
    "product_type_id" BIGINT NOT NULL,
    "is_active" BOOLEAN NOT NULL,

    CONSTRAINT "tenant_product_type_pkey" PRIMARY KEY ("tenant_id","product_type_id")
);

-- CreateTable
CREATE TABLE "branch" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100),
    "address" TEXT,
    "phone" VARCHAR(30),

    CONSTRAINT "branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "branch_id" BIGINT,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(30),
    "email" VARCHAR(100),
    "credit_limit" BIGINT NOT NULL,
    "current_balance" BIGINT NOT NULL,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "status" VARCHAR(30) NOT NULL,

    CONSTRAINT "agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_feature" (
    "plan_id" BIGINT NOT NULL,
    "feature_key" VARCHAR(50) NOT NULL,
    "config" JSONB,
    "is_enabled" BOOLEAN NOT NULL,

    CONSTRAINT "plan_feature_pkey" PRIMARY KEY ("plan_id","feature_key")
);

-- CreateTable
CREATE TABLE "tenant_setting" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "scope_type" VARCHAR(50) NOT NULL,
    "scope_id" BIGINT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_user" (
    "id" BIGSERIAL NOT NULL,
    "email" VARCHAR(100),
    "phone" VARCHAR(30),
    "full_name" VARCHAR(100) NOT NULL,
    "mfa_enabled" BOOLEAN NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership" (
    "id" BIGSERIAL NOT NULL,
    "staff_user_id" BIGINT NOT NULL,
    "tenant_id" BIGINT,
    "branch_id" BIGINT,
    "role_id" BIGINT NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT,
    "name" VARCHAR(50) NOT NULL,
    "is_system" BOOLEAN NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "role_id" BIGINT NOT NULL,
    "permission_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "approval_request" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "maker_id" BIGINT NOT NULL,
    "checker_id" BIGINT,
    "action_type" VARCHAR(50) NOT NULL,
    "payload" JSONB,
    "status" VARCHAR(30) NOT NULL,
    "reviewed_at" TIMESTAMPTZ(6),

    CONSTRAINT "approval_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "actor_type" VARCHAR(50) NOT NULL,
    "actor_id" BIGINT NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" BIGINT NOT NULL,
    "diff" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_identity" (
    "id" BIGSERIAL NOT NULL,
    "phone" VARCHAR(30),
    "email" VARCHAR(100),
    "full_name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_identity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_profile" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "identity_id" BIGINT NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "consent_marketing" BOOLEAN NOT NULL,
    "consent_data_share" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_traveler" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "gender" VARCHAR(20) NOT NULL,
    "date_of_birth" DATE,
    "nationality" VARCHAR(50) NOT NULL,
    "traveler_type" VARCHAR(30) NOT NULL,

    CONSTRAINT "saved_traveler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_traveler_document" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "saved_traveler_id" BIGINT NOT NULL,
    "doc_type_code" VARCHAR(50) NOT NULL,
    "document_number_encrypted" TEXT,
    "expiry_date" DATE,
    "country_code" VARCHAR(10) NOT NULL,

    CONSTRAINT "saved_traveler_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_session" (
    "id" BIGSERIAL NOT NULL,
    "identity_id" BIGINT NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "customer_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_domain" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "domain_name" VARCHAR(255) NOT NULL,
    "is_primary" BOOLEAN NOT NULL,
    "is_verified" BOOLEAN NOT NULL,

    CONSTRAINT "sales_domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_key" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "agent_id" BIGINT,
    "key_type" VARCHAR(30) NOT NULL,
    "public_key" VARCHAR(100) NOT NULL,
    "secret_hash" VARCHAR(255) NOT NULL,
    "allowed_origins" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoint" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "url" TEXT,
    "secret" VARCHAR(255) NOT NULL,
    "event_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL,

    CONSTRAINT "webhook_endpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_event" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "topic" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB,
    "status" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_key" (
    "tenant_id" BIGINT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "response_status" INTEGER NOT NULL,
    "response_body" JSONB,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "idempotency_key_pkey" PRIMARY KEY ("tenant_id","key")
);

-- CreateTable
CREATE TABLE "product_type" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "inventory_model" VARCHAR(50) NOT NULL,
    "default_workflow_id" BIGINT,
    "config" JSONB,
    "is_active" BOOLEAN NOT NULL,

    CONSTRAINT "product_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lookup_type" (
    "id" BIGSERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "lookup_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lookup_value" (
    "id" BIGSERIAL NOT NULL,
    "lookup_type_id" BIGINT NOT NULL,
    "product_type_id" BIGINT,
    "code" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,

    CONSTRAINT "lookup_value_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_definition" (
    "id" BIGSERIAL NOT NULL,
    "product_type_id" BIGINT,
    "entity_type" VARCHAR(50) NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "data_type" VARCHAR(50) NOT NULL,
    "validation" JSONB,
    "is_required" BOOLEAN NOT NULL,
    "is_searchable" BOOLEAN NOT NULL,
    "is_encrypted" BOOLEAN NOT NULL,
    "visibility" VARCHAR(30) NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL,

    CONSTRAINT "attribute_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_definition" (
    "id" BIGSERIAL NOT NULL,
    "product_type_id" BIGINT,
    "key" VARCHAR(100) NOT NULL,
    "value_type" VARCHAR(30) NOT NULL,
    "default_value" TEXT,
    "platform_cap" TEXT,
    "allowed_scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "policy_definition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow" (
    "id" BIGSERIAL NOT NULL,
    "product_type_id" BIGINT,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_status" (
    "workflow_id" BIGINT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "is_terminal" BOOLEAN NOT NULL,

    CONSTRAINT "workflow_status_pkey" PRIMARY KEY ("workflow_id","code")
);

-- CreateTable
CREATE TABLE "workflow_transition" (
    "workflow_id" BIGINT NOT NULL,
    "from_code" VARCHAR(50) NOT NULL,
    "to_code" VARCHAR(50) NOT NULL,
    "trigger_name" VARCHAR(100) NOT NULL,
    "required_permission" VARCHAR(100) NOT NULL,

    CONSTRAINT "workflow_transition_pkey" PRIMARY KEY ("workflow_id","from_code","to_code")
);

-- CreateTable
CREATE TABLE "rule" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT,
    "product_type_id" BIGINT,
    "rule_type" VARCHAR(50) NOT NULL,
    "scope_type" VARCHAR(50) NOT NULL,
    "scope_id" BIGINT NOT NULL,
    "priority" INTEGER NOT NULL,
    "condition" JSONB,
    "action" JSONB,
    "valid_from" TIMESTAMPTZ(6),
    "valid_to" TIMESTAMPTZ(6),
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL,

    CONSTRAINT "rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT,
    "product_type_id" BIGINT,
    "template_type" VARCHAR(50) NOT NULL,
    "event_code" VARCHAR(50) NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "is_active" BOOLEAN NOT NULL,

    CONSTRAINT "template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature" (
    "key" VARCHAR(50) NOT NULL,
    "description" TEXT,

    CONSTRAINT "feature_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "currency" (
    "code" VARCHAR(3) NOT NULL,
    "symbol" VARCHAR(10) NOT NULL,

    CONSTRAINT "currency_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "exchange_rate" (
    "id" BIGSERIAL NOT NULL,
    "from_code" VARCHAR(3) NOT NULL,
    "to_code" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(12,6) NOT NULL,
    "effective_at" TIMESTAMPTZ(6),

    CONSTRAINT "exchange_rate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location" (
    "id" BIGSERIAL NOT NULL,
    "parent_id" BIGINT,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "location_type" VARCHAR(50) NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL,

    CONSTRAINT "location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offering" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT,
    "product_type_id" BIGINT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "selection_mode" VARCHAR(30) NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "offering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offering_feature" (
    "offering_id" BIGINT NOT NULL,
    "feature_code" VARCHAR(50) NOT NULL,

    CONSTRAINT "offering_feature_pkey" PRIMARY KEY ("offering_id","feature_code")
);

-- CreateTable
CREATE TABLE "layout_template" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "product_type_id" BIGINT NOT NULL,
    "offering_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "total_capacity" INTEGER NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "layout_template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "layout_cell" (
    "id" BIGSERIAL NOT NULL,
    "layout_id" BIGINT NOT NULL,
    "parent_cell_id" BIGINT,
    "part_no" INTEGER NOT NULL,
    "row_index" INTEGER NOT NULL,
    "col_index" INTEGER NOT NULL,
    "cell_type_code" VARCHAR(30) NOT NULL,
    "unit_type_code" VARCHAR(30) NOT NULL,
    "label" VARCHAR(30) NOT NULL,
    "position_code" VARCHAR(30) NOT NULL,
    "level" INTEGER NOT NULL,
    "group_id" VARCHAR(50) NOT NULL,
    "price_tier" VARCHAR(30) NOT NULL,
    "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sell_mode" VARCHAR(30) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "attributes" JSONB,

    CONSTRAINT "layout_cell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "product_type_id" BIGINT NOT NULL,
    "offering_id" BIGINT NOT NULL,
    "identifier" VARCHAR(100) NOT NULL,
    "registration_no" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "attributes" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_part" (
    "resource_id" BIGINT NOT NULL,
    "part_no" INTEGER NOT NULL,
    "layout_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "resource_part_pkey" PRIMARY KEY ("resource_id","part_no")
);

-- CreateTable
CREATE TABLE "resource_document" (
    "id" BIGSERIAL NOT NULL,
    "resource_id" BIGINT NOT NULL,
    "doc_type_code" VARCHAR(50) NOT NULL,
    "document_no" VARCHAR(100) NOT NULL,
    "expiry_date" DATE,

    CONSTRAINT "resource_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_line" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "product_type_id" BIGINT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "status" VARCHAR(30) NOT NULL,

    CONSTRAINT "service_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_stop" (
    "service_line_id" BIGINT NOT NULL,
    "seq" INTEGER NOT NULL,
    "location_id" BIGINT NOT NULL,
    "offset_minutes" INTEGER NOT NULL,
    "is_pickup_drop" BOOLEAN NOT NULL,

    CONSTRAINT "service_stop_pkey" PRIMARY KEY ("service_line_id","seq")
);

-- CreateTable
CREATE TABLE "schedule" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "service_line_id" BIGINT NOT NULL,
    "resource_id" BIGINT,
    "days_of_week" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "departure_time" TIME(6),
    "valid_from" DATE,
    "valid_to" DATE,

    CONSTRAINT "schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fare_rule" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "offering_id" BIGINT NOT NULL,
    "service_line_id" BIGINT,
    "component_type" VARCHAR(50) NOT NULL,
    "amount" BIGINT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "condition" JSONB,
    "priority" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "valid_from" TIMESTAMPTZ(6),
    "valid_to" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "fare_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ancillary_product" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "product_type_id" BIGINT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL,

    CONSTRAINT "ancillary_product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ancillary_offer" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "ancillary_id" BIGINT NOT NULL,
    "scope_type" VARCHAR(50) NOT NULL,
    "scope_id" BIGINT NOT NULL,
    "price" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "stock_limit" INTEGER NOT NULL,

    CONSTRAINT "ancillary_offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "product_type_id" BIGINT NOT NULL,
    "service_line_id" BIGINT NOT NULL,
    "resource_id" BIGINT,
    "trip_code" VARCHAR(50) NOT NULL,
    "departure_date" DATE,
    "status" VARCHAR(30) NOT NULL,
    "supply_mode" VARCHAR(30) NOT NULL,
    "layout_snapshot" JSONB,
    "offering_snapshot" JSONB,
    "policy_version" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_stop" (
    "trip_id" BIGINT NOT NULL,
    "seq" INTEGER NOT NULL,
    "location_id" BIGINT NOT NULL,
    "scheduled_arr" TIMESTAMPTZ(6),
    "scheduled_dep" TIMESTAMPTZ(6),

    CONSTRAINT "trip_stop_pkey" PRIMARY KEY ("trip_id","seq")
);

-- CreateTable
CREATE TABLE "trip_unit" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "trip_id" BIGINT NOT NULL,
    "branch_id" BIGINT,
    "agent_id" BIGINT,
    "parent_unit_id" BIGINT,
    "unit_label" VARCHAR(30) NOT NULL,
    "cell_type_code" VARCHAR(30) NOT NULL,
    "unit_type_code" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "pool_code" VARCHAR(50) NOT NULL,
    "eligibility_lock" VARCHAR(50) NOT NULL,
    "base_price" BIGINT NOT NULL,
    "current_price" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "held_qty" INTEGER NOT NULL DEFAULT 0,
    "sold_qty" INTEGER NOT NULL DEFAULT 0,
    "attributes" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "trip_unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_span" (
    "id" BIGSERIAL NOT NULL,
    "trip_unit_id" BIGINT NOT NULL,
    "hold_id" BIGINT,
    "booking_item_id" BIGINT,
    "span_type" VARCHAR(30) NOT NULL,
    "start_stop_seq" INTEGER NOT NULL,
    "end_stop_seq" INTEGER NOT NULL,
    "start_time" TIMESTAMPTZ(6),
    "end_time" TIMESTAMPTZ(6),

    CONSTRAINT "unit_span_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hold" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "trip_id" BIGINT NOT NULL,
    "profile_id" BIGINT,
    "staff_user_id" BIGINT,
    "branch_id" BIGINT,
    "agent_id" BIGINT,
    "status" VARCHAR(30) NOT NULL,
    "channel_code" VARCHAR(50) NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hold_item" (
    "hold_id" BIGINT NOT NULL,
    "trip_unit_id" BIGINT NOT NULL,
    "locked_price" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hold_item_pkey" PRIMARY KEY ("hold_id","trip_unit_id")
);

-- CreateTable
CREATE TABLE "allocation_rule" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "branch_id" BIGINT,
    "agent_id" BIGINT,
    "scope_type" VARCHAR(50) NOT NULL,
    "scope_id" BIGINT NOT NULL,
    "pool_code" VARCHAR(50) NOT NULL,
    "allocation_mode" VARCHAR(30) NOT NULL,
    "quota_units" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quota_count" INTEGER NOT NULL,
    "release_at" TIMESTAMPTZ(6),
    "release_to_pool" VARCHAR(50) NOT NULL,

    CONSTRAINT "allocation_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allocation_event" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "trip_id" BIGINT NOT NULL,
    "trip_unit_id" BIGINT NOT NULL,
    "actor_id" BIGINT,
    "from_pool" VARCHAR(50) NOT NULL,
    "to_pool" VARCHAR(50) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allocation_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_change" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "trip_id" BIGINT NOT NULL,
    "actor_id" BIGINT,
    "change_type" VARCHAR(50) NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "customer_profile_id" BIGINT,
    "branch_id" BIGINT,
    "agent_id" BIGINT,
    "sold_by" BIGINT,
    "booking_ref" VARCHAR(50) NOT NULL,
    "sales_channel" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "total_amount" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "exchange_rate" DECIMAL(12,6) NOT NULL,
    "policy_version" INTEGER NOT NULL,
    "rule_versions" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traveler" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "type" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "gender" VARCHAR(20) NOT NULL,
    "date_of_birth" DATE,
    "nationality" VARCHAR(50) NOT NULL,
    "seat_label" VARCHAR(30) NOT NULL,

    CONSTRAINT "traveler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traveler_document" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "traveler_id" BIGINT NOT NULL,
    "doc_type" VARCHAR(50) NOT NULL,
    "number_encrypted" TEXT,
    "expiry_date" DATE,
    "country" VARCHAR(10) NOT NULL,

    CONSTRAINT "traveler_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_item" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "trip_id" BIGINT,
    "trip_unit_id" BIGINT,
    "traveler_id" BIGINT,
    "ancillary_id" BIGINT,
    "item_type" VARCHAR(30) NOT NULL,
    "leg_no" INTEGER NOT NULL,
    "unit_price" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total_amount" BIGINT NOT NULL,
    "status" VARCHAR(30) NOT NULL,

    CONSTRAINT "booking_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_price_line" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "booking_item_id" BIGINT,
    "rule_id" BIGINT,
    "component_type" VARCHAR(50) NOT NULL,
    "rate" DECIMAL(8,4) NOT NULL,
    "base_amount" BIGINT NOT NULL,
    "tax_amount" BIGINT NOT NULL,
    "total_amount" BIGINT NOT NULL,

    CONSTRAINT "booking_price_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "booking_item_id" BIGINT NOT NULL,
    "ticket_no" VARCHAR(50) NOT NULL,
    "qr_code_payload" TEXT,
    "qr_signature" TEXT,
    "status" VARCHAR(30) NOT NULL,
    "issued_at" TIMESTAMPTZ(6),

    CONSTRAINT "ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL,
    "gateway_provider" VARCHAR(50) NOT NULL,
    "gateway_txn_id" VARCHAR(100) NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "idempotency_key" VARCHAR(100) NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "payment_id" BIGINT NOT NULL,
    "approved_by" BIGINT,
    "amount" BIGINT NOT NULL,
    "reason" TEXT,
    "status" VARCHAR(30) NOT NULL,

    CONSTRAINT "refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "discount_type" VARCHAR(30) NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_cart_amount" BIGINT NOT NULL,
    "max_discount" BIGINT NOT NULL,
    "start_at" TIMESTAMPTZ(6),
    "end_at" TIMESTAMPTZ(6),

    CONSTRAINT "promo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_redemption" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "promo_id" BIGINT NOT NULL,
    "booking_id" BIGINT NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "discount_applied" BIGINT NOT NULL,

    CONSTRAINT "promo_redemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_account" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "profile_id" BIGINT NOT NULL,
    "balance" BIGINT NOT NULL,

    CONSTRAINT "wallet_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_account" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "profile_id" BIGINT NOT NULL,

    CONSTRAINT "loyalty_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entry" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "account_code" VARCHAR(50) NOT NULL,
    "debit_amount" BIGINT NOT NULL,
    "credit_amount" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "ref_type" VARCHAR(50) NOT NULL,
    "ref_id" BIGINT NOT NULL,
    "posted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlement" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "cycle_start" DATE,
    "cycle_end" DATE,
    "gross_sales" BIGINT NOT NULL,
    "commission_fee" BIGINT NOT NULL,
    "refund_deductions" BIGINT NOT NULL,
    "payout_amount" BIGINT NOT NULL,
    "status" VARCHAR(30) NOT NULL,

    CONSTRAINT "settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_log" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "template_id" BIGINT NOT NULL,
    "channel" VARCHAR(30) NOT NULL,
    "recipient" VARCHAR(100) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "sent_at" TIMESTAMPTZ(6),
    "metadata" JSONB,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_connection" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "product_type_id" BIGINT NOT NULL,
    "supplier_name" VARCHAR(100) NOT NULL,
    "supply_mode" VARCHAR(30) NOT NULL,
    "api_endpoint" TEXT,
    "auth_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "config" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "supplier_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_mapping" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "connection_id" BIGINT NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "internal_id" BIGINT NOT NULL,
    "external_code" VARCHAR(100) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "external_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_booking_ref" (
    "tenant_id" BIGINT NOT NULL,
    "booking_item_id" BIGINT NOT NULL,
    "connection_id" BIGINT NOT NULL,
    "supplier_pnr" VARCHAR(100) NOT NULL,

    CONSTRAINT "supplier_booking_ref_pkey" PRIMARY KEY ("booking_item_id","connection_id")
);

-- CreateTable
CREATE TABLE "integration_log" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "connection_id" BIGINT NOT NULL,
    "direction" VARCHAR(20) NOT NULL,
    "endpoint" TEXT,
    "status_code" INTEGER NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "request_payload" JSONB,
    "response_payload" JSONB,

    CONSTRAINT "integration_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crew_member" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "staff_user_id" BIGINT,
    "branch_id" BIGINT,
    "first_name" VARCHAR(50) NOT NULL,
    "last_name" VARCHAR(50) NOT NULL,
    "phone" VARCHAR(30),
    "emergency_contact" VARCHAR(50) NOT NULL,
    "employment_type" VARCHAR(30) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "hire_date" DATE,
    "address" TEXT,
    "attributes" JSONB,

    CONSTRAINT "crew_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crew_member_role" (
    "crew_member_id" BIGINT NOT NULL,
    "crew_role_code" VARCHAR(50) NOT NULL,
    "is_primary" BOOLEAN NOT NULL,
    "notes" TEXT,

    CONSTRAINT "crew_member_role_pkey" PRIMARY KEY ("crew_member_id","crew_role_code")
);

-- CreateTable
CREATE TABLE "crew_document" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "crew_member_id" BIGINT NOT NULL,
    "doc_type" VARCHAR(50) NOT NULL,
    "number_encrypted" TEXT,
    "issue_date" DATE,
    "expiry_date" DATE,
    "issuing_authority" VARCHAR(100) NOT NULL,
    "is_verified" BOOLEAN NOT NULL,
    "verification_metadata" JSONB,

    CONSTRAINT "crew_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crew_leave" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "crew_member_id" BIGINT NOT NULL,
    "leave_type" VARCHAR(50) NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "status" VARCHAR(30) NOT NULL,

    CONSTRAINT "crew_leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crew_requirement" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "product_type_id" BIGINT NOT NULL,
    "offering_id" BIGINT,
    "service_line_id" BIGINT,
    "crew_role_code" VARCHAR(50) NOT NULL,
    "min_count" INTEGER NOT NULL,
    "max_count" INTEGER NOT NULL,

    CONSTRAINT "crew_requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_crew" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "resource_id" BIGINT NOT NULL,
    "crew_member_id" BIGINT NOT NULL,
    "crew_role_code" VARCHAR(50) NOT NULL,
    "valid_from" DATE,
    "valid_to" DATE,

    CONSTRAINT "resource_crew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_crew" (
    "id" BIGSERIAL NOT NULL,
    "tenant_id" BIGINT NOT NULL,
    "trip_id" BIGINT NOT NULL,
    "crew_member_id" BIGINT NOT NULL,
    "assigned_by" BIGINT,
    "replaced_by_id" BIGINT,
    "crew_role_code" VARCHAR(50) NOT NULL,
    "duty_status" VARCHAR(30) NOT NULL,
    "assigned_at" TIMESTAMPTZ(6),
    "checked_in_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6),
    "notes" TEXT,

    CONSTRAINT "trip_crew_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_plan_id_idx" ON "tenant"("plan_id");

-- CreateIndex
CREATE INDEX "tenant_product_type_product_type_id_idx" ON "tenant_product_type"("product_type_id");

-- CreateIndex
CREATE INDEX "branch_tenant_id_idx" ON "branch"("tenant_id");

-- CreateIndex
CREATE INDEX "agent_tenant_id_idx" ON "agent"("tenant_id");

-- CreateIndex
CREATE INDEX "agent_branch_id_idx" ON "agent"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "plan_code_key" ON "plan"("code");

-- CreateIndex
CREATE INDEX "tenant_setting_tenant_id_idx" ON "tenant_setting"("tenant_id");

-- CreateIndex
CREATE INDEX "membership_staff_user_id_idx" ON "membership"("staff_user_id");

-- CreateIndex
CREATE INDEX "membership_tenant_id_idx" ON "membership"("tenant_id");

-- CreateIndex
CREATE INDEX "membership_branch_id_idx" ON "membership"("branch_id");

-- CreateIndex
CREATE INDEX "membership_role_id_idx" ON "membership"("role_id");

-- CreateIndex
CREATE INDEX "role_tenant_id_idx" ON "role"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "permission_code_key" ON "permission"("code");

-- CreateIndex
CREATE INDEX "role_permission_permission_id_idx" ON "role_permission"("permission_id");

-- CreateIndex
CREATE INDEX "approval_request_tenant_id_idx" ON "approval_request"("tenant_id");

-- CreateIndex
CREATE INDEX "approval_request_maker_id_idx" ON "approval_request"("maker_id");

-- CreateIndex
CREATE INDEX "approval_request_checker_id_idx" ON "approval_request"("checker_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_identity_phone_key" ON "customer_identity"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "customer_identity_email_key" ON "customer_identity"("email");

-- CreateIndex
CREATE INDEX "customer_profile_tenant_id_idx" ON "customer_profile"("tenant_id");

-- CreateIndex
CREATE INDEX "customer_profile_identity_id_idx" ON "customer_profile"("identity_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_profile_tenant_id_identity_id_key" ON "customer_profile"("tenant_id", "identity_id");

-- CreateIndex
CREATE INDEX "saved_traveler_tenant_id_idx" ON "saved_traveler"("tenant_id");

-- CreateIndex
CREATE INDEX "saved_traveler_profile_id_idx" ON "saved_traveler"("profile_id");

-- CreateIndex
CREATE INDEX "saved_traveler_document_tenant_id_idx" ON "saved_traveler_document"("tenant_id");

-- CreateIndex
CREATE INDEX "saved_traveler_document_saved_traveler_id_idx" ON "saved_traveler_document"("saved_traveler_id");

-- CreateIndex
CREATE INDEX "customer_session_identity_id_idx" ON "customer_session"("identity_id");

-- CreateIndex
CREATE INDEX "customer_session_tenant_id_idx" ON "customer_session"("tenant_id");

-- CreateIndex
CREATE INDEX "sales_domain_tenant_id_idx" ON "sales_domain"("tenant_id");

-- CreateIndex
CREATE INDEX "api_key_tenant_id_idx" ON "api_key"("tenant_id");

-- CreateIndex
CREATE INDEX "api_key_agent_id_idx" ON "api_key"("agent_id");

-- CreateIndex
CREATE INDEX "webhook_endpoint_tenant_id_idx" ON "webhook_endpoint"("tenant_id");

-- CreateIndex
CREATE INDEX "outbox_event_tenant_id_idx" ON "outbox_event"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_type_code_key" ON "product_type"("code");

-- CreateIndex
CREATE INDEX "product_type_default_workflow_id_idx" ON "product_type"("default_workflow_id");

-- CreateIndex
CREATE INDEX "lookup_value_lookup_type_id_idx" ON "lookup_value"("lookup_type_id");

-- CreateIndex
CREATE INDEX "lookup_value_product_type_id_idx" ON "lookup_value"("product_type_id");

-- CreateIndex
CREATE INDEX "attribute_definition_product_type_id_idx" ON "attribute_definition"("product_type_id");

-- CreateIndex
CREATE INDEX "policy_definition_product_type_id_idx" ON "policy_definition"("product_type_id");

-- CreateIndex
CREATE INDEX "workflow_product_type_id_idx" ON "workflow"("product_type_id");

-- CreateIndex
CREATE INDEX "rule_tenant_id_idx" ON "rule"("tenant_id");

-- CreateIndex
CREATE INDEX "rule_product_type_id_idx" ON "rule"("product_type_id");

-- CreateIndex
CREATE INDEX "template_tenant_id_idx" ON "template"("tenant_id");

-- CreateIndex
CREATE INDEX "template_product_type_id_idx" ON "template"("product_type_id");

-- CreateIndex
CREATE INDEX "location_parent_id_idx" ON "location"("parent_id");

-- CreateIndex
CREATE INDEX "offering_tenant_id_idx" ON "offering"("tenant_id");

-- CreateIndex
CREATE INDEX "offering_product_type_id_idx" ON "offering"("product_type_id");

-- CreateIndex
CREATE INDEX "layout_template_tenant_id_idx" ON "layout_template"("tenant_id");

-- CreateIndex
CREATE INDEX "layout_template_product_type_id_idx" ON "layout_template"("product_type_id");

-- CreateIndex
CREATE INDEX "layout_template_offering_id_idx" ON "layout_template"("offering_id");

-- CreateIndex
CREATE INDEX "layout_cell_layout_id_idx" ON "layout_cell"("layout_id");

-- CreateIndex
CREATE INDEX "layout_cell_parent_cell_id_idx" ON "layout_cell"("parent_cell_id");

-- CreateIndex
CREATE INDEX "resource_tenant_id_idx" ON "resource"("tenant_id");

-- CreateIndex
CREATE INDEX "resource_product_type_id_idx" ON "resource"("product_type_id");

-- CreateIndex
CREATE INDEX "resource_offering_id_idx" ON "resource"("offering_id");

-- CreateIndex
CREATE INDEX "resource_part_layout_id_idx" ON "resource_part"("layout_id");

-- CreateIndex
CREATE INDEX "resource_document_resource_id_idx" ON "resource_document"("resource_id");

-- CreateIndex
CREATE INDEX "service_line_tenant_id_idx" ON "service_line"("tenant_id");

-- CreateIndex
CREATE INDEX "service_line_product_type_id_idx" ON "service_line"("product_type_id");

-- CreateIndex
CREATE INDEX "service_stop_location_id_idx" ON "service_stop"("location_id");

-- CreateIndex
CREATE INDEX "schedule_tenant_id_idx" ON "schedule"("tenant_id");

-- CreateIndex
CREATE INDEX "schedule_service_line_id_idx" ON "schedule"("service_line_id");

-- CreateIndex
CREATE INDEX "schedule_resource_id_idx" ON "schedule"("resource_id");

-- CreateIndex
CREATE INDEX "fare_rule_tenant_id_idx" ON "fare_rule"("tenant_id");

-- CreateIndex
CREATE INDEX "fare_rule_offering_id_idx" ON "fare_rule"("offering_id");

-- CreateIndex
CREATE INDEX "fare_rule_service_line_id_idx" ON "fare_rule"("service_line_id");

-- CreateIndex
CREATE INDEX "ancillary_product_tenant_id_idx" ON "ancillary_product"("tenant_id");

-- CreateIndex
CREATE INDEX "ancillary_product_product_type_id_idx" ON "ancillary_product"("product_type_id");

-- CreateIndex
CREATE INDEX "ancillary_offer_tenant_id_idx" ON "ancillary_offer"("tenant_id");

-- CreateIndex
CREATE INDEX "ancillary_offer_ancillary_id_idx" ON "ancillary_offer"("ancillary_id");

-- CreateIndex
CREATE INDEX "trip_tenant_id_idx" ON "trip"("tenant_id");

-- CreateIndex
CREATE INDEX "trip_product_type_id_idx" ON "trip"("product_type_id");

-- CreateIndex
CREATE INDEX "trip_service_line_id_idx" ON "trip"("service_line_id");

-- CreateIndex
CREATE INDEX "trip_resource_id_idx" ON "trip"("resource_id");

-- CreateIndex
CREATE INDEX "trip_stop_location_id_idx" ON "trip_stop"("location_id");

-- CreateIndex
CREATE INDEX "trip_unit_tenant_id_idx" ON "trip_unit"("tenant_id");

-- CreateIndex
CREATE INDEX "trip_unit_trip_id_idx" ON "trip_unit"("trip_id");

-- CreateIndex
CREATE INDEX "trip_unit_branch_id_idx" ON "trip_unit"("branch_id");

-- CreateIndex
CREATE INDEX "trip_unit_agent_id_idx" ON "trip_unit"("agent_id");

-- CreateIndex
CREATE INDEX "trip_unit_parent_unit_id_idx" ON "trip_unit"("parent_unit_id");

-- CreateIndex
CREATE INDEX "unit_span_trip_unit_id_idx" ON "unit_span"("trip_unit_id");

-- CreateIndex
CREATE INDEX "unit_span_hold_id_idx" ON "unit_span"("hold_id");

-- CreateIndex
CREATE INDEX "unit_span_booking_item_id_idx" ON "unit_span"("booking_item_id");

-- CreateIndex
CREATE INDEX "hold_tenant_id_idx" ON "hold"("tenant_id");

-- CreateIndex
CREATE INDEX "hold_trip_id_idx" ON "hold"("trip_id");

-- CreateIndex
CREATE INDEX "hold_profile_id_idx" ON "hold"("profile_id");

-- CreateIndex
CREATE INDEX "hold_staff_user_id_idx" ON "hold"("staff_user_id");

-- CreateIndex
CREATE INDEX "hold_branch_id_idx" ON "hold"("branch_id");

-- CreateIndex
CREATE INDEX "hold_agent_id_idx" ON "hold"("agent_id");

-- CreateIndex
CREATE INDEX "hold_item_trip_unit_id_idx" ON "hold_item"("trip_unit_id");

-- CreateIndex
CREATE INDEX "allocation_rule_tenant_id_idx" ON "allocation_rule"("tenant_id");

-- CreateIndex
CREATE INDEX "allocation_rule_branch_id_idx" ON "allocation_rule"("branch_id");

-- CreateIndex
CREATE INDEX "allocation_rule_agent_id_idx" ON "allocation_rule"("agent_id");

-- CreateIndex
CREATE INDEX "allocation_event_tenant_id_idx" ON "allocation_event"("tenant_id");

-- CreateIndex
CREATE INDEX "allocation_event_trip_id_idx" ON "allocation_event"("trip_id");

-- CreateIndex
CREATE INDEX "allocation_event_trip_unit_id_idx" ON "allocation_event"("trip_unit_id");

-- CreateIndex
CREATE INDEX "allocation_event_actor_id_idx" ON "allocation_event"("actor_id");

-- CreateIndex
CREATE INDEX "trip_change_tenant_id_idx" ON "trip_change"("tenant_id");

-- CreateIndex
CREATE INDEX "trip_change_trip_id_idx" ON "trip_change"("trip_id");

-- CreateIndex
CREATE INDEX "trip_change_actor_id_idx" ON "trip_change"("actor_id");

-- CreateIndex
CREATE UNIQUE INDEX "booking_booking_ref_key" ON "booking"("booking_ref");

-- CreateIndex
CREATE INDEX "booking_tenant_id_idx" ON "booking"("tenant_id");

-- CreateIndex
CREATE INDEX "booking_customer_profile_id_idx" ON "booking"("customer_profile_id");

-- CreateIndex
CREATE INDEX "booking_branch_id_idx" ON "booking"("branch_id");

-- CreateIndex
CREATE INDEX "booking_agent_id_idx" ON "booking"("agent_id");

-- CreateIndex
CREATE INDEX "booking_sold_by_idx" ON "booking"("sold_by");

-- CreateIndex
CREATE INDEX "traveler_tenant_id_idx" ON "traveler"("tenant_id");

-- CreateIndex
CREATE INDEX "traveler_booking_id_idx" ON "traveler"("booking_id");

-- CreateIndex
CREATE INDEX "traveler_document_tenant_id_idx" ON "traveler_document"("tenant_id");

-- CreateIndex
CREATE INDEX "traveler_document_traveler_id_idx" ON "traveler_document"("traveler_id");

-- CreateIndex
CREATE INDEX "booking_item_tenant_id_idx" ON "booking_item"("tenant_id");

-- CreateIndex
CREATE INDEX "booking_item_booking_id_idx" ON "booking_item"("booking_id");

-- CreateIndex
CREATE INDEX "booking_item_trip_id_idx" ON "booking_item"("trip_id");

-- CreateIndex
CREATE INDEX "booking_item_trip_unit_id_idx" ON "booking_item"("trip_unit_id");

-- CreateIndex
CREATE INDEX "booking_item_traveler_id_idx" ON "booking_item"("traveler_id");

-- CreateIndex
CREATE INDEX "booking_item_ancillary_id_idx" ON "booking_item"("ancillary_id");

-- CreateIndex
CREATE INDEX "booking_price_line_tenant_id_idx" ON "booking_price_line"("tenant_id");

-- CreateIndex
CREATE INDEX "booking_price_line_booking_id_idx" ON "booking_price_line"("booking_id");

-- CreateIndex
CREATE INDEX "booking_price_line_booking_item_id_idx" ON "booking_price_line"("booking_item_id");

-- CreateIndex
CREATE INDEX "booking_price_line_rule_id_idx" ON "booking_price_line"("rule_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_ticket_no_key" ON "ticket"("ticket_no");

-- CreateIndex
CREATE INDEX "ticket_tenant_id_idx" ON "ticket"("tenant_id");

-- CreateIndex
CREATE INDEX "ticket_booking_item_id_idx" ON "ticket"("booking_item_id");

-- CreateIndex
CREATE INDEX "payment_tenant_id_idx" ON "payment"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_booking_id_idx" ON "payment"("booking_id");

-- CreateIndex
CREATE INDEX "refund_tenant_id_idx" ON "refund"("tenant_id");

-- CreateIndex
CREATE INDEX "refund_booking_id_idx" ON "refund"("booking_id");

-- CreateIndex
CREATE INDEX "refund_payment_id_idx" ON "refund"("payment_id");

-- CreateIndex
CREATE INDEX "refund_approved_by_idx" ON "refund"("approved_by");

-- CreateIndex
CREATE INDEX "promo_tenant_id_idx" ON "promo"("tenant_id");

-- CreateIndex
CREATE INDEX "promo_redemption_tenant_id_idx" ON "promo_redemption"("tenant_id");

-- CreateIndex
CREATE INDEX "promo_redemption_promo_id_idx" ON "promo_redemption"("promo_id");

-- CreateIndex
CREATE INDEX "promo_redemption_booking_id_idx" ON "promo_redemption"("booking_id");

-- CreateIndex
CREATE INDEX "promo_redemption_profile_id_idx" ON "promo_redemption"("profile_id");

-- CreateIndex
CREATE INDEX "wallet_account_tenant_id_idx" ON "wallet_account"("tenant_id");

-- CreateIndex
CREATE INDEX "wallet_account_profile_id_idx" ON "wallet_account"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_account_profile_id_key" ON "loyalty_account"("profile_id");

-- CreateIndex
CREATE INDEX "loyalty_account_tenant_id_idx" ON "loyalty_account"("tenant_id");

-- CreateIndex
CREATE INDEX "ledger_entry_tenant_id_idx" ON "ledger_entry"("tenant_id");

-- CreateIndex
CREATE INDEX "settlement_tenant_id_idx" ON "settlement"("tenant_id");

-- CreateIndex
CREATE INDEX "notification_log_tenant_id_idx" ON "notification_log"("tenant_id");

-- CreateIndex
CREATE INDEX "notification_log_template_id_idx" ON "notification_log"("template_id");

-- CreateIndex
CREATE INDEX "supplier_connection_tenant_id_idx" ON "supplier_connection"("tenant_id");

-- CreateIndex
CREATE INDEX "supplier_connection_product_type_id_idx" ON "supplier_connection"("product_type_id");

-- CreateIndex
CREATE INDEX "external_mapping_tenant_id_idx" ON "external_mapping"("tenant_id");

-- CreateIndex
CREATE INDEX "external_mapping_connection_id_idx" ON "external_mapping"("connection_id");

-- CreateIndex
CREATE INDEX "supplier_booking_ref_connection_id_idx" ON "supplier_booking_ref"("connection_id");

-- CreateIndex
CREATE INDEX "integration_log_tenant_id_idx" ON "integration_log"("tenant_id");

-- CreateIndex
CREATE INDEX "integration_log_connection_id_idx" ON "integration_log"("connection_id");

-- CreateIndex
CREATE UNIQUE INDEX "crew_member_staff_user_id_key" ON "crew_member"("staff_user_id");

-- CreateIndex
CREATE INDEX "crew_member_tenant_id_idx" ON "crew_member"("tenant_id");

-- CreateIndex
CREATE INDEX "crew_member_branch_id_idx" ON "crew_member"("branch_id");

-- CreateIndex
CREATE INDEX "crew_document_tenant_id_idx" ON "crew_document"("tenant_id");

-- CreateIndex
CREATE INDEX "crew_document_crew_member_id_idx" ON "crew_document"("crew_member_id");

-- CreateIndex
CREATE INDEX "crew_leave_tenant_id_idx" ON "crew_leave"("tenant_id");

-- CreateIndex
CREATE INDEX "crew_leave_crew_member_id_idx" ON "crew_leave"("crew_member_id");

-- CreateIndex
CREATE INDEX "crew_requirement_tenant_id_idx" ON "crew_requirement"("tenant_id");

-- CreateIndex
CREATE INDEX "crew_requirement_product_type_id_idx" ON "crew_requirement"("product_type_id");

-- CreateIndex
CREATE INDEX "crew_requirement_offering_id_idx" ON "crew_requirement"("offering_id");

-- CreateIndex
CREATE INDEX "crew_requirement_service_line_id_idx" ON "crew_requirement"("service_line_id");

-- CreateIndex
CREATE INDEX "resource_crew_tenant_id_idx" ON "resource_crew"("tenant_id");

-- CreateIndex
CREATE INDEX "resource_crew_resource_id_idx" ON "resource_crew"("resource_id");

-- CreateIndex
CREATE INDEX "resource_crew_crew_member_id_idx" ON "resource_crew"("crew_member_id");

-- CreateIndex
CREATE INDEX "trip_crew_tenant_id_idx" ON "trip_crew"("tenant_id");

-- CreateIndex
CREATE INDEX "trip_crew_trip_id_idx" ON "trip_crew"("trip_id");

-- CreateIndex
CREATE INDEX "trip_crew_crew_member_id_idx" ON "trip_crew"("crew_member_id");

-- CreateIndex
CREATE INDEX "trip_crew_assigned_by_idx" ON "trip_crew"("assigned_by");

-- CreateIndex
CREATE INDEX "trip_crew_replaced_by_id_idx" ON "trip_crew"("replaced_by_id");

-- AddForeignKey
ALTER TABLE "tenant" ADD CONSTRAINT "tenant_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_product_type" ADD CONSTRAINT "tenant_product_type_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_product_type" ADD CONSTRAINT "tenant_product_type_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "branch" ADD CONSTRAINT "branch_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent" ADD CONSTRAINT "agent_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent" ADD CONSTRAINT "agent_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_feature" ADD CONSTRAINT "plan_feature_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_setting" ADD CONSTRAINT "tenant_setting_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membership" ADD CONSTRAINT "membership_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_maker_id_fkey" FOREIGN KEY ("maker_id") REFERENCES "staff_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_checker_id_fkey" FOREIGN KEY ("checker_id") REFERENCES "staff_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profile" ADD CONSTRAINT "customer_profile_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_profile" ADD CONSTRAINT "customer_profile_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "customer_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_traveler" ADD CONSTRAINT "saved_traveler_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_traveler" ADD CONSTRAINT "saved_traveler_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_traveler_document" ADD CONSTRAINT "saved_traveler_document_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_traveler_document" ADD CONSTRAINT "saved_traveler_document_saved_traveler_id_fkey" FOREIGN KEY ("saved_traveler_id") REFERENCES "saved_traveler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_session" ADD CONSTRAINT "customer_session_identity_id_fkey" FOREIGN KEY ("identity_id") REFERENCES "customer_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_session" ADD CONSTRAINT "customer_session_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_domain" ADD CONSTRAINT "sales_domain_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoint" ADD CONSTRAINT "webhook_endpoint_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_event" ADD CONSTRAINT "outbox_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_key" ADD CONSTRAINT "idempotency_key_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_type" ADD CONSTRAINT "product_type_default_workflow_id_fkey" FOREIGN KEY ("default_workflow_id") REFERENCES "workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lookup_value" ADD CONSTRAINT "lookup_value_lookup_type_id_fkey" FOREIGN KEY ("lookup_type_id") REFERENCES "lookup_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lookup_value" ADD CONSTRAINT "lookup_value_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attribute_definition" ADD CONSTRAINT "attribute_definition_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_definition" ADD CONSTRAINT "policy_definition_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_status" ADD CONSTRAINT "workflow_status_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_transition" ADD CONSTRAINT "workflow_transition_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule" ADD CONSTRAINT "rule_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule" ADD CONSTRAINT "rule_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template" ADD CONSTRAINT "template_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location" ADD CONSTRAINT "location_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offering" ADD CONSTRAINT "offering_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offering" ADD CONSTRAINT "offering_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offering_feature" ADD CONSTRAINT "offering_feature_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "offering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_template" ADD CONSTRAINT "layout_template_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_template" ADD CONSTRAINT "layout_template_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_template" ADD CONSTRAINT "layout_template_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "offering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_cell" ADD CONSTRAINT "layout_cell_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "layout_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "layout_cell" ADD CONSTRAINT "layout_cell_parent_cell_id_fkey" FOREIGN KEY ("parent_cell_id") REFERENCES "layout_cell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "offering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_part" ADD CONSTRAINT "resource_part_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_part" ADD CONSTRAINT "resource_part_layout_id_fkey" FOREIGN KEY ("layout_id") REFERENCES "layout_template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_document" ADD CONSTRAINT "resource_document_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_line" ADD CONSTRAINT "service_line_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_line" ADD CONSTRAINT "service_line_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_stop" ADD CONSTRAINT "service_stop_service_line_id_fkey" FOREIGN KEY ("service_line_id") REFERENCES "service_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_stop" ADD CONSTRAINT "service_stop_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_service_line_id_fkey" FOREIGN KEY ("service_line_id") REFERENCES "service_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule" ADD CONSTRAINT "schedule_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fare_rule" ADD CONSTRAINT "fare_rule_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fare_rule" ADD CONSTRAINT "fare_rule_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "offering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fare_rule" ADD CONSTRAINT "fare_rule_service_line_id_fkey" FOREIGN KEY ("service_line_id") REFERENCES "service_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ancillary_product" ADD CONSTRAINT "ancillary_product_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ancillary_product" ADD CONSTRAINT "ancillary_product_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ancillary_offer" ADD CONSTRAINT "ancillary_offer_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ancillary_offer" ADD CONSTRAINT "ancillary_offer_ancillary_id_fkey" FOREIGN KEY ("ancillary_id") REFERENCES "ancillary_product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_service_line_id_fkey" FOREIGN KEY ("service_line_id") REFERENCES "service_line"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip" ADD CONSTRAINT "trip_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_stop" ADD CONSTRAINT "trip_stop_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_stop" ADD CONSTRAINT "trip_stop_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_unit" ADD CONSTRAINT "trip_unit_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_unit" ADD CONSTRAINT "trip_unit_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_unit" ADD CONSTRAINT "trip_unit_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_unit" ADD CONSTRAINT "trip_unit_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_unit" ADD CONSTRAINT "trip_unit_parent_unit_id_fkey" FOREIGN KEY ("parent_unit_id") REFERENCES "trip_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_span" ADD CONSTRAINT "unit_span_trip_unit_id_fkey" FOREIGN KEY ("trip_unit_id") REFERENCES "trip_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_span" ADD CONSTRAINT "unit_span_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "hold"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_span" ADD CONSTRAINT "unit_span_booking_item_id_fkey" FOREIGN KEY ("booking_item_id") REFERENCES "booking_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hold" ADD CONSTRAINT "hold_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hold" ADD CONSTRAINT "hold_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hold" ADD CONSTRAINT "hold_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hold" ADD CONSTRAINT "hold_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hold" ADD CONSTRAINT "hold_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hold" ADD CONSTRAINT "hold_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hold_item" ADD CONSTRAINT "hold_item_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "hold"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hold_item" ADD CONSTRAINT "hold_item_trip_unit_id_fkey" FOREIGN KEY ("trip_unit_id") REFERENCES "trip_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_rule" ADD CONSTRAINT "allocation_rule_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_rule" ADD CONSTRAINT "allocation_rule_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_rule" ADD CONSTRAINT "allocation_rule_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_event" ADD CONSTRAINT "allocation_event_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_event" ADD CONSTRAINT "allocation_event_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_event" ADD CONSTRAINT "allocation_event_trip_unit_id_fkey" FOREIGN KEY ("trip_unit_id") REFERENCES "trip_unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allocation_event" ADD CONSTRAINT "allocation_event_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "staff_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_change" ADD CONSTRAINT "trip_change_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_change" ADD CONSTRAINT "trip_change_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_change" ADD CONSTRAINT "trip_change_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "staff_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_customer_profile_id_fkey" FOREIGN KEY ("customer_profile_id") REFERENCES "customer_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_sold_by_fkey" FOREIGN KEY ("sold_by") REFERENCES "staff_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler" ADD CONSTRAINT "traveler_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler" ADD CONSTRAINT "traveler_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler_document" ADD CONSTRAINT "traveler_document_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "traveler_document" ADD CONSTRAINT "traveler_document_traveler_id_fkey" FOREIGN KEY ("traveler_id") REFERENCES "traveler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_item" ADD CONSTRAINT "booking_item_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_item" ADD CONSTRAINT "booking_item_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_item" ADD CONSTRAINT "booking_item_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_item" ADD CONSTRAINT "booking_item_trip_unit_id_fkey" FOREIGN KEY ("trip_unit_id") REFERENCES "trip_unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_item" ADD CONSTRAINT "booking_item_traveler_id_fkey" FOREIGN KEY ("traveler_id") REFERENCES "traveler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_item" ADD CONSTRAINT "booking_item_ancillary_id_fkey" FOREIGN KEY ("ancillary_id") REFERENCES "ancillary_product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_price_line" ADD CONSTRAINT "booking_price_line_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_price_line" ADD CONSTRAINT "booking_price_line_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_price_line" ADD CONSTRAINT "booking_price_line_booking_item_id_fkey" FOREIGN KEY ("booking_item_id") REFERENCES "booking_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_price_line" ADD CONSTRAINT "booking_price_line_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_booking_item_id_fkey" FOREIGN KEY ("booking_item_id") REFERENCES "booking_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund" ADD CONSTRAINT "refund_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "staff_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo" ADD CONSTRAINT "promo_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_redemption" ADD CONSTRAINT "promo_redemption_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_redemption" ADD CONSTRAINT "promo_redemption_promo_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "promo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_redemption" ADD CONSTRAINT "promo_redemption_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_redemption" ADD CONSTRAINT "promo_redemption_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_account" ADD CONSTRAINT "wallet_account_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_account" ADD CONSTRAINT "wallet_account_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_account" ADD CONSTRAINT "loyalty_account_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_account" ADD CONSTRAINT "loyalty_account_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "customer_profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlement" ADD CONSTRAINT "settlement_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_connection" ADD CONSTRAINT "supplier_connection_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_connection" ADD CONSTRAINT "supplier_connection_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_mapping" ADD CONSTRAINT "external_mapping_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_mapping" ADD CONSTRAINT "external_mapping_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "supplier_connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_booking_ref" ADD CONSTRAINT "supplier_booking_ref_booking_item_id_fkey" FOREIGN KEY ("booking_item_id") REFERENCES "booking_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_booking_ref" ADD CONSTRAINT "supplier_booking_ref_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "supplier_connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_log" ADD CONSTRAINT "integration_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_log" ADD CONSTRAINT "integration_log_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "supplier_connection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_member" ADD CONSTRAINT "crew_member_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_member" ADD CONSTRAINT "crew_member_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "staff_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_member" ADD CONSTRAINT "crew_member_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_member_role" ADD CONSTRAINT "crew_member_role_crew_member_id_fkey" FOREIGN KEY ("crew_member_id") REFERENCES "crew_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_document" ADD CONSTRAINT "crew_document_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_document" ADD CONSTRAINT "crew_document_crew_member_id_fkey" FOREIGN KEY ("crew_member_id") REFERENCES "crew_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_leave" ADD CONSTRAINT "crew_leave_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_leave" ADD CONSTRAINT "crew_leave_crew_member_id_fkey" FOREIGN KEY ("crew_member_id") REFERENCES "crew_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_requirement" ADD CONSTRAINT "crew_requirement_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_requirement" ADD CONSTRAINT "crew_requirement_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_requirement" ADD CONSTRAINT "crew_requirement_offering_id_fkey" FOREIGN KEY ("offering_id") REFERENCES "offering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crew_requirement" ADD CONSTRAINT "crew_requirement_service_line_id_fkey" FOREIGN KEY ("service_line_id") REFERENCES "service_line"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_crew" ADD CONSTRAINT "resource_crew_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_crew" ADD CONSTRAINT "resource_crew_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_crew" ADD CONSTRAINT "resource_crew_crew_member_id_fkey" FOREIGN KEY ("crew_member_id") REFERENCES "crew_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_crew" ADD CONSTRAINT "trip_crew_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_crew" ADD CONSTRAINT "trip_crew_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_crew" ADD CONSTRAINT "trip_crew_crew_member_id_fkey" FOREIGN KEY ("crew_member_id") REFERENCES "crew_member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_crew" ADD CONSTRAINT "trip_crew_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "staff_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_crew" ADD CONSTRAINT "trip_crew_replaced_by_id_fkey" FOREIGN KEY ("replaced_by_id") REFERENCES "trip_crew"("id") ON DELETE SET NULL ON UPDATE CASCADE;
