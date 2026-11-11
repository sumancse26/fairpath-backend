/**
 * Demo seed: Multi-Tenant Ticketing and Booking Platform
 *
 * Inserts all platform-level CONFIGURATION data and exactly ONE staff user (super admin).
 * No tenants, branches, agents, customers, trips, bookings or money data are created.
 *
 * Place at:   prisma/seed.ts
 * package.json:
 *   "prisma": { "seed": "tsx prisma/seed.ts" }      // or "ts-node prisma/seed.ts"
 * Run:
 *   npx prisma db seed
 *
 * The script is idempotent: running it twice does not create duplicates.
 *
 * Optional env vars for the super admin:
 *   SUPERADMIN_EMAIL, SUPERADMIN_PHONE, SUPERADMIN_NAME
 *
 * Conventions / assumptions:
 *  - Money amounts (e.g. refund_approval_threshold) are in minor units (poisha for BDT).
 *  - "Platform-level" rows use tenant_id = NULL (roles, rules, templates) or scope_type = 'PLATFORM'.
 *  - Tenant-scoped config (tenant_setting, tenant_product_type) is skipped because it needs a tenant.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';

const connectionString = process.env.DATABASE_URL || '';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
type Json = Prisma.InputJsonValue;

const log = (msg: string) => console.log(`  ✓ ${msg}`);

// ---------------------------------------------------------------------------
// 1. PLANS & FEATURES
// ---------------------------------------------------------------------------
const FEATURES: [string, string][] = [
  ['MULTI_BRANCH', 'Operate multiple branches / counters under one tenant'],
  ['AGENT_NETWORK', 'Onboard sales agents with credit limits and commission'],
  ['API_ACCESS', 'Public and server API keys for integrations'],
  ['WEBHOOKS', 'Outbound webhook endpoints for domain events'],
  ['SUPPLIER_INTEGRATION', 'Connect third-party GDS/CRS supplier inventory'],
  ['CREW_MANAGEMENT', 'Crew records, document compliance and duty rosters'],
  ['DYNAMIC_PRICING', 'Rule-driven dynamic fare components'],
  ['PROMOS', 'Promo codes and discount campaigns'],
  ['LOYALTY', 'Loyalty points accounts for customers'],
  ['MAKER_CHECKER', 'Four-eyes approval for sensitive actions'],
  ['CUSTOM_DOMAIN', 'Tenant web storefront on a custom domain'],
  ['MARKETPLACE_LISTING', 'List inventory on the shared marketplace channel'],
];

const PLANS: {
  code: string;
  name: string;
  features: Record<string, { on: boolean; config?: Json }>;
}[] = [
  {
    code: 'STARTER',
    name: 'Starter',
    features: {
      MULTI_BRANCH: { on: false, config: { max_branches: 1 } },
      AGENT_NETWORK: { on: false },
      API_ACCESS: { on: false },
      WEBHOOKS: { on: false },
      SUPPLIER_INTEGRATION: { on: false },
      CREW_MANAGEMENT: { on: false },
      DYNAMIC_PRICING: { on: false },
      PROMOS: { on: true, config: { max_active_promos: 3 } },
      LOYALTY: { on: false },
      MAKER_CHECKER: { on: false },
      CUSTOM_DOMAIN: { on: false },
      MARKETPLACE_LISTING: { on: true },
    },
  },
  {
    code: 'GROWTH',
    name: 'Growth',
    features: {
      MULTI_BRANCH: { on: true, config: { max_branches: 10 } },
      AGENT_NETWORK: { on: true, config: { max_agents: 100 } },
      API_ACCESS: { on: true, config: { rate_limit_per_minute: 300 } },
      WEBHOOKS: { on: true, config: { max_endpoints: 5 } },
      SUPPLIER_INTEGRATION: { on: false },
      CREW_MANAGEMENT: { on: true },
      DYNAMIC_PRICING: { on: false },
      PROMOS: { on: true, config: { max_active_promos: 25 } },
      LOYALTY: { on: false },
      MAKER_CHECKER: { on: true },
      CUSTOM_DOMAIN: { on: true },
      MARKETPLACE_LISTING: { on: true },
    },
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    features: {
      MULTI_BRANCH: { on: true, config: { max_branches: null } },
      AGENT_NETWORK: { on: true, config: { max_agents: null } },
      API_ACCESS: { on: true, config: { rate_limit_per_minute: 3000 } },
      WEBHOOKS: { on: true, config: { max_endpoints: 50 } },
      SUPPLIER_INTEGRATION: { on: true, config: { max_connections: 20 } },
      CREW_MANAGEMENT: { on: true },
      DYNAMIC_PRICING: { on: true },
      PROMOS: { on: true, config: { max_active_promos: null } },
      LOYALTY: { on: true },
      MAKER_CHECKER: { on: true },
      CUSTOM_DOMAIN: { on: true },
      MARKETPLACE_LISTING: { on: true },
    },
  },
];

async function seedPlans() {
  for (const [key, description] of FEATURES) {
    await prisma.feature.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
  }
  log(`${FEATURES.length} features`);

  for (const p of PLANS) {
    const plan = await prisma.plan.upsert({
      where: { code: p.code },
      update: { name: p.name },
      create: { code: p.code, name: p.name },
    });
    for (const [featureKey, f] of Object.entries(p.features)) {
      const data = { isEnabled: f.on, config: f.config ?? Prisma.JsonNull };
      await prisma.planFeature.upsert({
        where: { planId_featureKey: { planId: plan.id, featureKey } },
        update: data,
        create: { planId: plan.id, featureKey, ...data },
      });
    }
  }
  log(`${PLANS.length} plans with plan_feature matrix`);
}

// ---------------------------------------------------------------------------
// 2. CURRENCIES & EXCHANGE RATES (demo rates, not live)
// ---------------------------------------------------------------------------
const CURRENCIES: [string, string][] = [
  ['BDT', '৳'],
  ['USD', '$'],
  ['EUR', '€'],
  ['GBP', '£'],
  ['INR', '₹'],
  ['SAR', 'SAR'],
  ['AED', 'AED'],
  ['MYR', 'RM'],
];
const RATES_FROM_BDT: Record<string, string> = {
  USD: '0.008200',
  EUR: '0.007600',
  GBP: '0.006500',
  INR: '0.690000',
  SAR: '0.030800',
  AED: '0.030100',
  MYR: '0.037000',
};

async function seedCurrencies() {
  for (const [code, symbol] of CURRENCIES) {
    await prisma.currency.upsert({
      where: { code },
      update: { symbol },
      create: { code, symbol },
    });
  }
  const now = new Date();
  for (const [to, rate] of Object.entries(RATES_FROM_BDT)) {
    const existing = await prisma.exchangeRate.findFirst({
      where: { fromCode: 'BDT', toCode: to },
    });
    if (existing)
      await prisma.exchangeRate.update({
        where: { id: existing.id },
        data: { rate },
      });
    else
      await prisma.exchangeRate.create({
        data: { fromCode: 'BDT', toCode: to, rate, effectiveAt: now },
      });
  }
  log(
    `${CURRENCIES.length} currencies, ${Object.keys(RATES_FROM_BDT).length} exchange rates`,
  );
}

// ---------------------------------------------------------------------------
// 3. PERMISSIONS, ROLES, ROLE_PERMISSIONS
// ---------------------------------------------------------------------------
const PERMISSIONS: [string, string][] = [
  // platform
  ['platform.tenant.manage', 'Onboard, suspend and terminate tenants'],
  ['platform.plan.manage', 'Manage subscription plans and plan features'],
  [
    'platform.config.manage',
    'Manage product types, registries, workflows and platform rules',
  ],
  ['platform.audit.read', 'Read platform-wide audit logs'],
  // tenancy & access
  ['staff.manage', 'Invite staff and manage memberships'],
  ['role.manage', 'Create roles and assign permissions'],
  ['branch.manage', 'Create and edit branches'],
  ['agent.manage', 'Create and edit agents, credit limits and commission'],
  ['setting.manage', 'Edit tenant settings and policies'],
  ['apikey.manage', 'Issue and revoke API keys'],
  ['webhook.manage', 'Manage webhook endpoints'],
  ['approval.request', 'Raise maker-checker approval requests'],
  ['approval.review', 'Approve or reject maker-checker requests'],
  ['audit.read', 'Read tenant audit logs'],
  // catalog
  ['catalog.read', 'View locations, offerings, resources and service lines'],
  ['catalog.manage', 'Edit offerings, resources, service lines and schedules'],
  ['layout.publish', 'Publish seat layout templates'],
  ['rule.manage', 'Edit pricing, refund, eligibility and quota rules'],
  ['fare.manage', 'Edit fare rules'],
  // operations
  ['trip.read', 'View trips and inventory'],
  ['trip.manage', 'Create, open, close and cancel trips'],
  ['trip.change', 'Record delays, swaps and schedule changes'],
  ['allocation.manage', 'Manage pool allocation and quotas'],
  ['hold.create', 'Place seat holds'],
  ['hold.release', 'Release or expire seat holds'],
  // booking & money
  ['booking.read', 'View bookings and tickets'],
  ['booking.create', 'Create bookings'],
  ['booking.cancel', 'Cancel bookings'],
  ['booking.board', 'Board and complete passengers'],
  ['booking.no_show', 'Mark bookings as no-show'],
  ['payment.capture', 'Capture payments (including counter cash)'],
  ['payment.read', 'View payments'],
  ['ticket.issue', 'Issue tickets'],
  ['ticket.void', 'Void or reissue tickets'],
  ['refund.request', 'Request refunds'],
  ['refund.approve', 'Approve and process refunds'],
  ['promo.manage', 'Manage promo codes'],
  ['ledger.read', 'View ledger entries and wallets'],
  ['settlement.manage', 'Draft, approve and pay settlements'],
  ['report.view', 'View sales and operations reports'],
  ['customer.read', 'View customer profiles'],
  ['customer.manage', 'Edit customer profiles and saved travelers'],
  // integration & crew
  ['supplier.manage', 'Manage supplier connections and external mappings'],
  ['crew.read', 'View crew and rosters'],
  ['crew.manage', 'Manage crew, documents, leave and duty assignments'],
];

const ALL = PERMISSIONS.map(([c]) => c);
const NON_PLATFORM = ALL.filter((c) => !c.startsWith('platform.'));

const ROLES: { name: string; perms: string[] }[] = [
  { name: 'Platform Super Admin', perms: ALL },
  { name: 'Tenant Admin', perms: NON_PLATFORM },
  {
    name: 'Operations Manager',
    perms: [
      'catalog.read',
      'catalog.manage',
      'layout.publish',
      'trip.read',
      'trip.manage',
      'trip.change',
      'allocation.manage',
      'hold.create',
      'hold.release',
      'booking.read',
      'booking.board',
      'booking.no_show',
      'crew.read',
      'crew.manage',
      'approval.request',
      'report.view',
    ],
  },
  {
    name: 'Counter Staff',
    perms: [
      'catalog.read',
      'trip.read',
      'hold.create',
      'hold.release',
      'booking.read',
      'booking.create',
      'booking.cancel',
      'payment.capture',
      'ticket.issue',
      'refund.request',
      'customer.read',
    ],
  },
  {
    name: 'Finance Officer',
    perms: [
      'payment.read',
      'refund.request',
      'refund.approve',
      'ledger.read',
      'settlement.manage',
      'promo.manage',
      'approval.request',
      'approval.review',
      'report.view',
      'booking.read',
    ],
  },
  {
    name: 'Boarding Supervisor',
    perms: [
      'trip.read',
      'booking.read',
      'booking.board',
      'booking.no_show',
      'crew.read',
    ],
  },
];

async function seedRoles(): Promise<Record<string, bigint>> {
  for (const [code, description] of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      update: { description },
      create: { code, description },
    });
  }
  log(`${PERMISSIONS.length} permissions`);

  const perms = await prisma.permission.findMany();
  const permId = new Map(perms.map((p: any) => [p.code, p.id]));
  const roleIds: Record<string, bigint> = {};

  for (const r of ROLES) {
    let role = await prisma.role.findFirst({
      where: { tenantId: null, name: r.name },
    });
    if (!role)
      role = await prisma.role.create({
        data: { tenantId: null, name: r.name, isSystem: true },
      });
    roleIds[r.name] = role.id;
    for (const code of r.perms) {
      const permissionId = permId.get(code);
      if (!permissionId)
        throw new Error(`Unknown permission ${code} in role ${r.name}`);
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
  }
  log(`${ROLES.length} system roles with role_permission grants`);
  return roleIds;
}

// ---------------------------------------------------------------------------
// 4. PRODUCT TYPES + WORKFLOWS
// ---------------------------------------------------------------------------
const PRODUCT_TYPES = [
  {
    code: 'BUS',
    name: 'Bus',
    inventoryModel: 'SEATED',
    config: {
      seat_selection: true,
      supports_pickup_drop: true,
      supports_sleeper: true,
    },
  },
  {
    code: 'TRAIN',
    name: 'Train',
    inventoryModel: 'SEATED',
    config: {
      seat_selection: true,
      supports_pickup_drop: false,
      coach_classes: true,
    },
  },
  {
    code: 'FLIGHT',
    name: 'Flight',
    inventoryModel: 'SEATED',
    config: {
      seat_selection: true,
      requires_passport_international: true,
      supports_ancillaries: true,
    },
  },
  {
    code: 'FERRY',
    name: 'Ferry / Launch',
    inventoryModel: 'HYBRID',
    config: {
      seat_selection: true,
      supports_deck_tickets: true,
      cabin_booking: true,
    },
  },
  {
    code: 'EVENT',
    name: 'Event',
    inventoryModel: 'HYBRID',
    config: {
      seat_selection: true,
      supports_standing: true,
      ticket_transfer: false,
    },
  },
  {
    code: 'TOUR',
    name: 'Tour Package',
    inventoryModel: 'COUNTED',
    config: {
      seat_selection: false,
      supports_ancillaries: true,
      group_booking: true,
    },
  },
];

type WfDef = {
  code: string;
  name: string;
  productTypeCode: string | null;
  labels: Record<string, string>;
};

const BOOKING_STATUSES: [string, boolean][] = [
  ['HELD', false],
  ['PAID', false],
  ['CONFIRMED', false],
  ['BOARDED', false],
  ['COMPLETED', true],
  ['EXPIRED', true],
  ['CANCELLED', false],
  ['REFUND_PENDING', false],
  ['REFUNDED', true],
  ['NO_SHOW', true],
];
// from, to, trigger, required permission
const BOOKING_TRANSITIONS: [string, string, string, string][] = [
  ['HELD', 'PAID', 'payment_captured', 'payment.capture'],
  ['HELD', 'EXPIRED', 'hold_expired', 'hold.release'],
  ['HELD', 'CANCELLED', 'cancel_booking', 'booking.cancel'],
  ['PAID', 'CONFIRMED', 'issue_ticket', 'ticket.issue'],
  ['PAID', 'CANCELLED', 'cancel_booking', 'booking.cancel'],
  ['CONFIRMED', 'CANCELLED', 'cancel_booking', 'booking.cancel'],
  ['CONFIRMED', 'BOARDED', 'board_passenger', 'booking.board'],
  ['CONFIRMED', 'NO_SHOW', 'mark_no_show', 'booking.no_show'],
  ['BOARDED', 'COMPLETED', 'complete_trip', 'booking.board'],
  ['CANCELLED', 'REFUND_PENDING', 'request_refund', 'refund.request'],
  ['REFUND_PENDING', 'REFUNDED', 'process_refund', 'refund.approve'],
];
const STD_LABELS: Record<string, string> = {
  HELD: 'Held',
  PAID: 'Paid',
  CONFIRMED: 'Confirmed',
  BOARDED: 'Boarded',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  REFUND_PENDING: 'Refund pending',
  REFUNDED: 'Refunded',
  NO_SHOW: 'No-show',
};
const WORKFLOWS: WfDef[] = [
  {
    code: 'BOOKING_STD',
    name: 'Standard booking lifecycle',
    productTypeCode: null,
    labels: STD_LABELS,
  },
  {
    code: 'BOOKING_EVENT',
    name: 'Event ticket lifecycle',
    productTypeCode: 'EVENT',
    labels: { ...STD_LABELS, BOARDED: 'Checked in', COMPLETED: 'Attended' },
  },
];

async function seedProductTypesAndWorkflows(): Promise<Record<string, bigint>> {
  const ptIds: Record<string, bigint> = {};
  for (const pt of PRODUCT_TYPES) {
    const row = await prisma.productType.upsert({
      where: { code: pt.code },
      update: {
        name: pt.name,
        inventoryModel: pt.inventoryModel,
        config: pt.config,
        isActive: true,
      },
      create: {
        code: pt.code,
        name: pt.name,
        inventoryModel: pt.inventoryModel,
        config: pt.config,
        isActive: true,
      },
    });
    ptIds[pt.code] = row.id;
  }
  log(`${PRODUCT_TYPES.length} product types`);

  const wfIds: Record<string, bigint> = {};
  const validPerms = new Set(ALL);
  for (const w of WORKFLOWS) {
    const productTypeId = w.productTypeCode ? ptIds[w.productTypeCode] : null;
    let wf = await prisma.workflow.findFirst({
      where: { code: w.code, productTypeId },
    });
    if (!wf)
      wf = await prisma.workflow.create({
        data: { code: w.code, name: w.name, productTypeId },
      });
    wfIds[w.code] = wf.id;

    for (const [code, isTerminal] of BOOKING_STATUSES) {
      const data = { label: w.labels[code], isTerminal };
      await prisma.workflowStatus.upsert({
        where: { workflowId_code: { workflowId: wf.id, code } },
        update: data,
        create: { workflowId: wf.id, code, ...data },
      });
    }
    for (const [
      fromCode,
      toCode,
      triggerName,
      requiredPermission,
    ] of BOOKING_TRANSITIONS) {
      if (!validPerms.has(requiredPermission))
        throw new Error(`Unknown permission ${requiredPermission}`);
      await prisma.workflowTransition.upsert({
        where: {
          workflowId_fromCode_toCode: { workflowId: wf.id, fromCode, toCode },
        },
        update: { triggerName, requiredPermission },
        create: {
          workflowId: wf.id,
          fromCode,
          toCode,
          triggerName,
          requiredPermission,
        },
      });
    }
  }
  log(
    `${WORKFLOWS.length} workflows (${BOOKING_STATUSES.length} statuses, ${BOOKING_TRANSITIONS.length} transitions each)`,
  );

  // default workflow per product type
  for (const pt of PRODUCT_TYPES) {
    const defaultWorkflowId =
      pt.code === 'EVENT' ? wfIds['BOOKING_EVENT'] : wfIds['BOOKING_STD'];
    await prisma.productType.update({
      where: { code: pt.code },
      data: { defaultWorkflowId },
    });
  }
  log('default workflow linked to each product type');
  return ptIds;
}

// ---------------------------------------------------------------------------
// 5. LOOKUPS
// ---------------------------------------------------------------------------
type LV = [code: string, label: string];
const GLOBAL_LOOKUPS: { code: string; name: string; values: LV[] }[] = [
  {
    code: 'SALES_CHANNEL',
    name: 'Sales channel',
    values: [
      ['MARKETPLACE', 'Marketplace'],
      ['TENANT_WEB', 'Tenant website'],
      ['COUNTER', 'Counter'],
      ['AGENT', 'Agent'],
      ['API', 'API'],
    ],
  },
  {
    code: 'POOL',
    name: 'Inventory pool',
    values: [
      ['SHARED', 'Shared'],
      ['MARKETPLACE', 'Marketplace'],
      ['TENANT_WEB', 'Tenant website'],
      ['COUNTER', 'Counter'],
      ['AGENT', 'Agent'],
      ['API', 'API'],
      ['HOLD', 'Hold'],
      ['CREW', 'Crew'],
    ],
  },
  {
    code: 'PAYMENT_METHOD',
    name: 'Payment method',
    values: [
      ['BKASH', 'bKash'],
      ['NAGAD', 'Nagad'],
      ['ROCKET', 'Rocket'],
      ['CREDIT_CARD', 'Credit card'],
      ['DEBIT_CARD', 'Debit card'],
      ['NET_BANKING', 'Net banking'],
      ['IN_APP_WALLET', 'In-app wallet'],
      ['COUNTER_CASH', 'Counter cash'],
      ['AGENT_CREDIT', 'Agent credit'],
    ],
  },
  {
    code: 'TRAVELER_TYPE',
    name: 'Traveler type',
    values: [
      ['ADULT', 'Adult'],
      ['CHILD', 'Child'],
      ['INFANT', 'Infant'],
      ['SENIOR', 'Senior citizen'],
    ],
  },
  {
    code: 'GENDER',
    name: 'Gender',
    values: [
      ['MALE', 'Male'],
      ['FEMALE', 'Female'],
      ['OTHER', 'Other'],
    ],
  },
  {
    code: 'TRAVELER_DOC_TYPE',
    name: 'Traveler document type',
    values: [
      ['NID', 'National ID'],
      ['PASSPORT', 'Passport'],
      ['BIRTH_CERTIFICATE', 'Birth certificate'],
    ],
  },
  {
    code: 'RESOURCE_DOC_TYPE',
    name: 'Resource document type',
    values: [
      ['FITNESS_CERT', 'Fitness certificate'],
      ['ROUTE_PERMIT', 'Route permit'],
      ['TAX_TOKEN', 'Tax token'],
      ['INSURANCE', 'Insurance'],
      ['SAFETY_CERT', 'Safety certificate'],
    ],
  },
  {
    code: 'CREW_DOC_TYPE',
    name: 'Crew document type',
    values: [
      ['DRIVING_LICENSE', 'Driving license'],
      ['NID', 'National ID'],
      ['HEALTH_CERT', 'Health certificate'],
      ['TRAINING_CERT', 'Training certificate'],
    ],
  },
  {
    code: 'CREW_ROLE',
    name: 'Crew role',
    values: [
      ['DRIVER', 'Driver'],
      ['CONTRACTOR', 'Contractor'],
      ['HELPER', 'Helper'],
      ['SUPERVISOR', 'Supervisor'],
    ],
  },
  {
    code: 'EMPLOYMENT_TYPE',
    name: 'Employment type',
    values: [
      ['EMPLOYEE', 'Employee'],
      ['CONTRACT', 'Contract'],
      ['DAILY', 'Daily wage'],
    ],
  },
  {
    code: 'LEAVE_TYPE',
    name: 'Leave type',
    values: [
      ['ANNUAL', 'Annual leave'],
      ['MEDICAL', 'Medical leave'],
      ['EMERGENCY', 'Emergency leave'],
      ['REST_DAY', 'Rest day'],
    ],
  },
  {
    code: 'LOCATION_TYPE',
    name: 'Location type',
    values: [
      ['CITY', 'City'],
      ['TERMINAL', 'Terminal'],
      ['STOP', 'Stop'],
      ['AIRPORT', 'Airport'],
      ['STATION', 'Station'],
      ['PORT', 'Port'],
    ],
  },
  {
    code: 'CELL_TYPE',
    name: 'Layout cell type',
    values: [
      ['SEAT', 'Seat'],
      ['BERTH', 'Berth'],
      ['DOUBLE_BERTH', 'Double berth'],
      ['AISLE', 'Aisle'],
      ['DRIVER', 'Driver'],
      ['DOOR', 'Door'],
      ['STAIRS', 'Stairs'],
      ['TOILET', 'Toilet'],
      ['LUGGAGE', 'Luggage'],
    ],
  },
  {
    code: 'UNIT_TYPE',
    name: 'Sellable unit type',
    values: [
      ['SEAT_WINDOW', 'Window seat'],
      ['SEAT_AISLE', 'Aisle seat'],
      ['SLEEPER_LOWER', 'Lower sleeper'],
      ['SLEEPER_UPPER', 'Upper sleeper'],
      ['CABIN', 'Cabin'],
    ],
  },
  {
    code: 'POSITION',
    name: 'Seat position',
    values: [
      ['WINDOW', 'Window'],
      ['AISLE', 'Aisle'],
      ['MIDDLE', 'Middle'],
      ['FRONT', 'Front'],
      ['REAR', 'Rear'],
    ],
  },
  {
    code: 'SELL_MODE',
    name: 'Sell mode',
    values: [
      ['WHOLE_ONLY', 'Whole unit only'],
      ['PER_PERSON', 'Per person'],
      ['EITHER', 'Either'],
    ],
  },
  {
    code: 'ELIGIBILITY_LOCK',
    name: 'Eligibility lock',
    values: [
      ['NONE', 'None'],
      ['LADIES_ONLY', 'Ladies only'],
      ['SENIOR_ONLY', 'Senior only'],
      ['ACCESSIBLE', 'Accessible'],
    ],
  },
  {
    code: 'PRICE_TIER',
    name: 'Seat price tier',
    values: [
      ['STANDARD', 'Standard'],
      ['PREMIUM', 'Premium'],
      ['FRONT_ROW', 'Front row'],
      ['EXTRA_LEGROOM', 'Extra legroom'],
      ['VIP', 'VIP'],
    ],
  },
  {
    code: 'ANCILLARY_CATEGORY',
    name: 'Ancillary category',
    values: [
      ['BAGGAGE', 'Baggage'],
      ['MEAL', 'Meal'],
      ['INSURANCE', 'Insurance'],
      ['WIFI', 'Wi-Fi'],
      ['LOUNGE', 'Lounge access'],
    ],
  },
  {
    code: 'OFFERING_FEATURE',
    name: 'Offering feature',
    values: [
      ['AC', 'Air conditioning'],
      ['WIFI', 'Wi-Fi'],
      ['CHARGING_PORT', 'Charging port'],
      ['TV', 'Entertainment screen'],
      ['BLANKET', 'Blanket'],
      ['WATER', 'Drinking water'],
      ['SNACKS', 'Snacks'],
      ['TOILET', 'Onboard toilet'],
      ['RECLINING_SEAT', 'Reclining seat'],
    ],
  },
  {
    code: 'TRIP_CHANGE_TYPE',
    name: 'Trip change type',
    values: [
      ['DELAY', 'Delay'],
      ['CANCEL', 'Cancellation'],
      ['RESOURCE_SWAP', 'Vehicle / resource swap'],
      ['SCHEDULE_CHANGE', 'Schedule change'],
      ['CREW_CHANGE', 'Crew change'],
    ],
  },
  {
    code: 'LEDGER_ACCOUNT',
    name: 'Ledger account',
    values: [
      ['RECEIVABLE_GATEWAY', 'Receivable: payment gateway'],
      ['REVENUE_TICKET', 'Revenue: tickets'],
      ['COMMISSION_PLATFORM', 'Commission: platform'],
      ['LIABILITY_CUSTOMER_WALLET', 'Liability: customer wallet'],
      ['PAYABLE_TENANT', 'Payable: tenant'],
    ],
  },
  {
    code: 'FARE_COMPONENT',
    name: 'Fare component',
    values: [
      ['BASE', 'Base fare'],
      ['SEAT_TIER', 'Seat tier surcharge'],
      ['MODIFIER', 'Modifier'],
      ['DYNAMIC', 'Dynamic pricing'],
      ['TAX', 'Tax'],
      ['DISCOUNT', 'Discount'],
    ],
  },
  {
    code: 'DISCOUNT_TYPE',
    name: 'Promo discount type',
    values: [
      ['PERCENT', 'Percentage'],
      ['FLAT', 'Flat amount'],
      ['CASHBACK', 'Cashback'],
    ],
  },
  {
    code: 'SUPPLY_MODE',
    name: 'Supply mode',
    values: [
      ['PLATFORM_OWNED', 'Platform owned'],
      ['SUPPLIER_REALTIME', 'Supplier real-time'],
      ['SEAT_BLOCK', 'Seat block'],
    ],
  },
  {
    code: 'SUPPLIER_AUTH_TYPE',
    name: 'Supplier auth type',
    values: [
      ['API_KEY', 'API key'],
      ['BEARER_OAUTH2', 'Bearer / OAuth2'],
      ['BASIC_AUTH', 'Basic auth'],
    ],
  },
  {
    code: 'APPROVAL_ACTION',
    name: 'Approval action type',
    values: [
      ['REFUND_OVER_LIMIT', 'Refund over limit'],
      ['FARE_CHANGE', 'Fare change'],
      ['LAYOUT_PUBLISH', 'Layout publish'],
      ['RULE_CHANGE', 'Rule change'],
      ['ALLOCATION_CHANGE_NEAR_DEPARTURE', 'Allocation change near departure'],
      ['PAYOUT_APPROVAL', 'Payout approval'],
    ],
  },
  {
    code: 'NOTIFICATION_CHANNEL',
    name: 'Notification channel',
    values: [
      ['SMS', 'SMS'],
      ['EMAIL', 'Email'],
      ['PUSH', 'Push notification'],
    ],
  },
  {
    code: 'LOCALE',
    name: 'Locale',
    values: [
      ['en_US', 'English'],
      ['bn_BD', 'বাংলা (Bangla)'],
      ['ar_SA', 'العربية (Arabic)'],
    ],
  },
];

// product-type-specific lookups (offering classes)
const OFFERING_CLASSES: Record<string, LV[]> = {
  BUS: [
    ['NON_AC', 'Non-AC'],
    ['AC_ECONOMY', 'AC Economy'],
    ['AC_BUSINESS', 'AC Business'],
    ['SLEEPER_COACH', 'Sleeper coach'],
  ],
  TRAIN: [
    ['SHOVAN', 'Shovan'],
    ['SHOVAN_CHAIR', 'Shovan Chair'],
    ['S_CHAIR', 'S. Chair'],
    ['SNIGDHA', 'Snigdha'],
    ['AC_SEAT', 'AC Seat'],
    ['AC_BERTH', 'AC Berth'],
  ],
  FLIGHT: [
    ['ECONOMY', 'Economy'],
    ['PREMIUM_ECONOMY', 'Premium Economy'],
    ['BUSINESS', 'Business'],
  ],
  FERRY: [
    ['DECK', 'Deck'],
    ['SINGLE_CABIN', 'Single cabin'],
    ['DOUBLE_CABIN', 'Double cabin'],
    ['VIP_CABIN', 'VIP cabin'],
  ],
  EVENT: [
    ['GENERAL', 'General admission'],
    ['GOLD', 'Gold'],
    ['VIP', 'VIP'],
  ],
  TOUR: [
    ['STANDARD', 'Standard package'],
    ['PREMIUM', 'Premium package'],
    ['PRIVATE', 'Private group'],
  ],
};

async function ensureLookup(
  code: string,
  name: string,
  values: LV[],
  productTypeId: bigint | null = null,
  typeName?: string,
) {
  let type = await prisma.lookupType.findFirst({ where: { code } });
  if (!type)
    type = await prisma.lookupType.create({
      data: { code, name: typeName ?? name },
    });
  let order = 10;
  for (const [vcode, label] of values) {
    const found = await prisma.lookupValue.findFirst({
      where: { lookupTypeId: type.id, productTypeId, code: vcode },
    });
    if (found)
      await prisma.lookupValue.update({
        where: { id: found.id },
        data: { label, sortOrder: order, isActive: true },
      });
    else
      await prisma.lookupValue.create({
        data: {
          lookupTypeId: type.id,
          productTypeId,
          code: vcode,
          label,
          sortOrder: order,
          isActive: true,
        },
      });
    order += 10;
  }
}

async function seedLookups(ptIds: Record<string, bigint>) {
  let total = 0;
  for (const l of GLOBAL_LOOKUPS) {
    await ensureLookup(l.code, l.name, l.values);
    total += l.values.length;
  }
  for (const [pt, values] of Object.entries(OFFERING_CLASSES)) {
    await ensureLookup('OFFERING_CLASS', 'Offering class', values, ptIds[pt]);
    total += values.length;
  }
  log(`${GLOBAL_LOOKUPS.length + 1} lookup types, ${total} lookup values`);
}

// ---------------------------------------------------------------------------
// 6. ATTRIBUTE DEFINITIONS
// ---------------------------------------------------------------------------
type Attr = {
  pt: string | null;
  entity: string;
  key: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'ENUM' | 'JSON';
  required?: boolean;
  searchable?: boolean;
  encrypted?: boolean;
  visibility?: 'PUBLIC' | 'INTERNAL_ONLY' | 'MASKED';
  validation?: Json;
};
const ATTRS: Attr[] = [
  // global
  {
    pt: null,
    entity: 'traveler',
    key: 'nationality',
    type: 'STRING',
    validation: { length: 2, pattern: '^[A-Z]{2}$' },
  },
  {
    pt: null,
    entity: 'traveler',
    key: 'emergency_contact',
    type: 'STRING',
    visibility: 'INTERNAL_ONLY',
  },
  {
    pt: null,
    entity: 'booking_item',
    key: 'special_request',
    type: 'STRING',
    validation: { maxLength: 255 },
  },
  {
    pt: null,
    entity: 'booking_item',
    key: 'boarding_point',
    type: 'STRING',
    searchable: true,
  },
  // bus
  {
    pt: 'BUS',
    entity: 'resource',
    key: 'coach_make',
    type: 'STRING',
    searchable: true,
  },
  { pt: 'BUS', entity: 'resource', key: 'model', type: 'STRING' },
  {
    pt: 'BUS',
    entity: 'resource',
    key: 'manufacturing_year',
    type: 'NUMBER',
    validation: { min: 1990, max: 2100, integer: true },
  },
  {
    pt: 'BUS',
    entity: 'resource',
    key: 'engine_no',
    type: 'STRING',
    encrypted: true,
    visibility: 'INTERNAL_ONLY',
  },
  {
    pt: 'BUS',
    entity: 'resource',
    key: 'chassis_no',
    type: 'STRING',
    encrypted: true,
    visibility: 'INTERNAL_ONLY',
  },
  {
    pt: 'BUS',
    entity: 'resource',
    key: 'has_ac',
    type: 'BOOLEAN',
    searchable: true,
    visibility: 'PUBLIC',
  },
  {
    pt: 'BUS',
    entity: 'trip',
    key: 'counter_name',
    type: 'STRING',
    visibility: 'PUBLIC',
  },
  // train
  {
    pt: 'TRAIN',
    entity: 'resource',
    key: 'coach_no',
    type: 'STRING',
    required: true,
    searchable: true,
    visibility: 'PUBLIC',
  },
  {
    pt: 'TRAIN',
    entity: 'resource',
    key: 'engine_no',
    type: 'STRING',
    visibility: 'INTERNAL_ONLY',
  },
  {
    pt: 'TRAIN',
    entity: 'trip',
    key: 'platform_no',
    type: 'STRING',
    visibility: 'PUBLIC',
  },
  // flight
  {
    pt: 'FLIGHT',
    entity: 'resource',
    key: 'aircraft_type',
    type: 'STRING',
    required: true,
    visibility: 'PUBLIC',
  },
  {
    pt: 'FLIGHT',
    entity: 'resource',
    key: 'tail_number',
    type: 'STRING',
    required: true,
    searchable: true,
    visibility: 'INTERNAL_ONLY',
  },
  {
    pt: 'FLIGHT',
    entity: 'trip',
    key: 'gate',
    type: 'STRING',
    visibility: 'PUBLIC',
  },
  {
    pt: 'FLIGHT',
    entity: 'trip',
    key: 'terminal',
    type: 'STRING',
    visibility: 'PUBLIC',
  },
  {
    pt: 'FLIGHT',
    entity: 'traveler',
    key: 'passport_no',
    type: 'STRING',
    required: true,
    encrypted: true,
    visibility: 'MASKED',
    validation: { pattern: '^[A-Z0-9]{6,9}$' },
  },
  {
    pt: 'FLIGHT',
    entity: 'traveler',
    key: 'passport_expiry',
    type: 'DATE',
    required: true,
    visibility: 'INTERNAL_ONLY',
  },
  // ferry
  {
    pt: 'FERRY',
    entity: 'resource',
    key: 'vessel_name',
    type: 'STRING',
    required: true,
    searchable: true,
    visibility: 'PUBLIC',
  },
  {
    pt: 'FERRY',
    entity: 'resource',
    key: 'passenger_capacity',
    type: 'NUMBER',
    validation: { min: 1, integer: true },
  },
  {
    pt: 'FERRY',
    entity: 'resource',
    key: 'life_jacket_count',
    type: 'NUMBER',
    visibility: 'INTERNAL_ONLY',
    validation: { min: 0, integer: true },
  },
  // event
  {
    pt: 'EVENT',
    entity: 'trip',
    key: 'venue_name',
    type: 'STRING',
    required: true,
    searchable: true,
    visibility: 'PUBLIC',
  },
  {
    pt: 'EVENT',
    entity: 'trip',
    key: 'age_restriction',
    type: 'NUMBER',
    validation: { min: 0, max: 21, integer: true },
  },
  {
    pt: 'EVENT',
    entity: 'offering',
    key: 'zone',
    type: 'ENUM',
    validation: { enum: ['FRONT', 'MIDDLE', 'BACK', 'BALCONY'] },
  },
  {
    pt: 'EVENT',
    entity: 'booking_item',
    key: 'entry_gate',
    type: 'STRING',
    visibility: 'PUBLIC',
  },
  // tour
  {
    pt: 'TOUR',
    entity: 'trip',
    key: 'guide_name',
    type: 'STRING',
    visibility: 'PUBLIC',
  },
  {
    pt: 'TOUR',
    entity: 'trip',
    key: 'difficulty',
    type: 'ENUM',
    searchable: true,
    visibility: 'PUBLIC',
    validation: { enum: ['EASY', 'MODERATE', 'HARD'] },
  },
  {
    pt: 'TOUR',
    entity: 'offering',
    key: 'itinerary_days',
    type: 'NUMBER',
    required: true,
    validation: { min: 1, max: 60, integer: true },
  },
  {
    pt: 'TOUR',
    entity: 'traveler',
    key: 'dietary_preference',
    type: 'ENUM',
    validation: {
      enum: ['NONE', 'VEGETARIAN', 'VEGAN', 'HALAL', 'GLUTEN_FREE'],
    },
  },
];

async function seedAttributes(ptIds: Record<string, bigint>) {
  for (const a of ATTRS) {
    const productTypeId = a.pt ? ptIds[a.pt] : null;
    const data = {
      dataType: a.type,
      validation: a.validation ?? Prisma.JsonNull,
      isRequired: a.required ?? false,
      isSearchable: a.searchable ?? false,
      isEncrypted: a.encrypted ?? false,
      visibility: a.visibility ?? 'PUBLIC',
      schemaVersion: 1,
      isActive: true,
    };
    const found = await prisma.attributeDefinition.findFirst({
      where: { productTypeId, entityType: a.entity, key: a.key },
    });
    if (found)
      await prisma.attributeDefinition.update({
        where: { id: found.id },
        data,
      });
    else
      await prisma.attributeDefinition.create({
        data: { productTypeId, entityType: a.entity, key: a.key, ...data },
      });
  }
  log(`${ATTRS.length} attribute definitions`);
}

// ---------------------------------------------------------------------------
// 7. POLICY DEFINITIONS
// ---------------------------------------------------------------------------
type Pol = {
  pt: string | null;
  key: string;
  type: 'INTEGER' | 'STRING' | 'BOOLEAN' | 'PERCENT';
  def: string;
  cap?: string;
  scopes: string[];
};
const T = ['TENANT'],
  TS = ['TENANT', 'SERVICE_LINE'],
  TSO = ['TENANT', 'SERVICE_LINE', 'OFFERING'],
  TB = ['TENANT', 'BRANCH'];
const POLICIES: Pol[] = [
  {
    pt: null,
    key: 'hold_ttl_minutes',
    type: 'INTEGER',
    def: '10',
    cap: '30',
    scopes: TS,
  },
  {
    pt: null,
    key: 'max_units_per_booking',
    type: 'INTEGER',
    def: '6',
    cap: '10',
    scopes: TSO,
  },
  {
    pt: null,
    key: 'booking_cutoff_minutes',
    type: 'INTEGER',
    def: '30',
    scopes: TS,
  },
  {
    pt: null,
    key: 'sales_open_days_ahead',
    type: 'INTEGER',
    def: '30',
    cap: '120',
    scopes: TS,
  },
  {
    pt: null,
    key: 'allow_counter_overbooking',
    type: 'BOOLEAN',
    def: 'false',
    cap: 'false',
    scopes: T,
  },
  {
    pt: null,
    key: 'allow_partial_payment',
    type: 'BOOLEAN',
    def: 'false',
    scopes: T,
  },
  { pt: null, key: 'refund_enabled', type: 'BOOLEAN', def: 'true', scopes: TS },
  {
    pt: null,
    key: 'refund_approval_threshold',
    type: 'INTEGER',
    def: '500000',
    scopes: T,
  },
  {
    pt: null,
    key: 'no_show_refund_percent',
    type: 'PERCENT',
    def: '0',
    cap: '50',
    scopes: TS,
  },
  {
    pt: null,
    key: 'ticket_qr_validity_hours',
    type: 'INTEGER',
    def: '48',
    cap: '168',
    scopes: T,
  },
  {
    pt: null,
    key: 'reserve_ladies_seats',
    type: 'BOOLEAN',
    def: 'false',
    scopes: TSO,
  },
  {
    pt: null,
    key: 'maker_checker_fare_change',
    type: 'BOOLEAN',
    def: 'true',
    cap: 'true',
    scopes: T,
  },
  {
    pt: null,
    key: 'allocation_change_cutoff_minutes',
    type: 'INTEGER',
    def: '120',
    scopes: TS,
  },
  {
    pt: null,
    key: 'platform_commission_percent',
    type: 'PERCENT',
    def: '2.5',
    cap: '10',
    scopes: ['PLATFORM', 'TENANT'],
  },
  { pt: null, key: 'default_currency', type: 'STRING', def: 'BDT', scopes: T },
  { pt: null, key: 'default_locale', type: 'STRING', def: 'bn_BD', scopes: TB },
  {
    pt: null,
    key: 'default_timezone',
    type: 'STRING',
    def: 'Asia/Dhaka',
    scopes: TB,
  },
  // per product type
  {
    pt: 'BUS',
    key: 'max_units_per_booking',
    type: 'INTEGER',
    def: '6',
    cap: '10',
    scopes: TSO,
  },
  {
    pt: 'BUS',
    key: 'reserve_ladies_seats',
    type: 'BOOLEAN',
    def: 'true',
    scopes: TSO,
  },
  {
    pt: 'TRAIN',
    key: 'max_units_per_booking',
    type: 'INTEGER',
    def: '4',
    cap: '6',
    scopes: TSO,
  },
  {
    pt: 'TRAIN',
    key: 'hold_ttl_minutes',
    type: 'INTEGER',
    def: '15',
    cap: '30',
    scopes: TS,
  },
  {
    pt: 'TRAIN',
    key: 'sales_open_days_ahead',
    type: 'INTEGER',
    def: '10',
    cap: '10',
    scopes: TS,
  },
  {
    pt: 'FLIGHT',
    key: 'max_units_per_booking',
    type: 'INTEGER',
    def: '9',
    cap: '9',
    scopes: TSO,
  },
  {
    pt: 'FLIGHT',
    key: 'checkin_close_minutes',
    type: 'INTEGER',
    def: '60',
    scopes: TS,
  },
  {
    pt: 'FLIGHT',
    key: 'web_checkin_open_hours',
    type: 'INTEGER',
    def: '24',
    scopes: TS,
  },
  {
    pt: 'FLIGHT',
    key: 'infants_per_adult',
    type: 'INTEGER',
    def: '1',
    cap: '1',
    scopes: T,
  },
  {
    pt: 'FERRY',
    key: 'max_units_per_booking',
    type: 'INTEGER',
    def: '10',
    cap: '20',
    scopes: TSO,
  },
  {
    pt: 'FERRY',
    key: 'booking_cutoff_minutes',
    type: 'INTEGER',
    def: '60',
    scopes: TS,
  },
  {
    pt: 'EVENT',
    key: 'max_units_per_booking',
    type: 'INTEGER',
    def: '10',
    cap: '20',
    scopes: TSO,
  },
  {
    pt: 'EVENT',
    key: 'ticket_transfer_allowed',
    type: 'BOOLEAN',
    def: 'false',
    scopes: TS,
  },
  {
    pt: 'TOUR',
    key: 'max_units_per_booking',
    type: 'INTEGER',
    def: '10',
    cap: '30',
    scopes: TSO,
  },
  {
    pt: 'TOUR',
    key: 'allow_partial_payment',
    type: 'BOOLEAN',
    def: 'true',
    scopes: TS,
  },
];

async function seedPolicies(ptIds: Record<string, bigint>) {
  for (const p of POLICIES) {
    const productTypeId = p.pt ? ptIds[p.pt] : null;
    const data = {
      valueType: p.type,
      defaultValue: p.def,
      platformCap: p.cap ?? null,
      allowedScopes: p.scopes,
    };
    const found = await prisma.policyDefinition.findFirst({
      where: { productTypeId, key: p.key },
    });
    if (found)
      await prisma.policyDefinition.update({ where: { id: found.id }, data });
    else
      await prisma.policyDefinition.create({
        data: { productTypeId, key: p.key, ...data },
      });
  }
  log(`${POLICIES.length} policy definitions`);
}

// ---------------------------------------------------------------------------
// 8. PLATFORM RULES (tenant_id = NULL, scope = PLATFORM)
// ---------------------------------------------------------------------------
type RuleDef = {
  pt: string | null;
  type: string;
  priority: number;
  condition: Json;
  action: Json;
};
const RULES: RuleDef[] = [
  // FEE
  {
    pt: null,
    type: 'FEE',
    priority: 10,
    condition: { sales_channel: ['MARKETPLACE'] },
    action: {
      fee: 'PERCENT',
      value: 2.5,
      ledger_account: 'COMMISSION_PLATFORM',
    },
  },
  {
    pt: null,
    type: 'FEE',
    priority: 20,
    condition: { sales_channel: ['TENANT_WEB', 'COUNTER', 'AGENT', 'API'] },
    action: {
      fee: 'PERCENT',
      value: 1.0,
      ledger_account: 'COMMISSION_PLATFORM',
    },
  },
  // PRICE
  {
    pt: null,
    type: 'PRICE',
    priority: 10,
    condition: { component: 'TAX' },
    action: { component_type: 'TAX', name: 'VAT', percent: 15 },
  },
  {
    pt: null,
    type: 'PRICE',
    priority: 20,
    condition: { traveler_type: 'INFANT' },
    action: {
      component_type: 'MODIFIER',
      name: 'Infant fare',
      percent_of_base: 10,
    },
  },
  {
    pt: null,
    type: 'PRICE',
    priority: 30,
    condition: { traveler_type: 'CHILD' },
    action: {
      component_type: 'MODIFIER',
      name: 'Child fare',
      percent_of_base: 50,
    },
  },
  {
    pt: 'TRAIN',
    type: 'PRICE',
    priority: 40,
    condition: { traveler_type: 'SENIOR' },
    action: {
      component_type: 'MODIFIER',
      name: 'Senior concession',
      percent_of_base: 90,
    },
  },
  // REFUND (hours before departure -> deduction)
  {
    pt: null,
    type: 'REFUND',
    priority: 10,
    condition: { hours_before_departure: { gte: 72 } },
    action: { deduction_percent: 10 },
  },
  {
    pt: null,
    type: 'REFUND',
    priority: 20,
    condition: { hours_before_departure: { gte: 24, lt: 72 } },
    action: { deduction_percent: 25 },
  },
  {
    pt: null,
    type: 'REFUND',
    priority: 30,
    condition: { hours_before_departure: { gte: 6, lt: 24 } },
    action: { deduction_percent: 50 },
  },
  {
    pt: null,
    type: 'REFUND',
    priority: 40,
    condition: { hours_before_departure: { lt: 6 } },
    action: { deduction_percent: 100 },
  },
  {
    pt: 'FLIGHT',
    type: 'REFUND',
    priority: 50,
    condition: { hours_before_departure: { lt: 3 } },
    action: { deduction_percent: 100, non_refundable: true },
  },
  // ELIGIBILITY
  {
    pt: null,
    type: 'ELIGIBILITY',
    priority: 10,
    condition: { eligibility_lock: 'LADIES_ONLY' },
    action: { require: { gender: 'FEMALE' } },
  },
  {
    pt: null,
    type: 'ELIGIBILITY',
    priority: 20,
    condition: { eligibility_lock: 'SENIOR_ONLY' },
    action: { require: { traveler_type: 'SENIOR' } },
  },
  {
    pt: null,
    type: 'ELIGIBILITY',
    priority: 30,
    condition: { traveler_type: ['CHILD', 'INFANT'] },
    action: { require_accompanying: 'ADULT' },
  },
  // VALIDATION
  {
    pt: null,
    type: 'VALIDATION',
    priority: 10,
    condition: { entity: 'booking' },
    action: { max_units_per_booking_ref: 'max_units_per_booking' },
  },
  {
    pt: 'FLIGHT',
    type: 'VALIDATION',
    priority: 20,
    condition: { route: 'INTERNATIONAL' },
    action: {
      require_attributes: ['passport_no', 'passport_expiry'],
      passport_min_validity_months: 6,
    },
  },
  {
    pt: 'FLIGHT',
    type: 'VALIDATION',
    priority: 30,
    condition: { traveler_type: 'INFANT' },
    action: { max_per_adult: 1 },
  },
  {
    pt: 'TRAIN',
    type: 'VALIDATION',
    priority: 20,
    condition: { traveler_doc_required: true },
    action: { require_doc_types: ['NID', 'BIRTH_CERTIFICATE'] },
  },
  // QUOTA
  {
    pt: null,
    type: 'QUOTA',
    priority: 10,
    condition: { minutes_before_departure: { lte: 120 } },
    action: { release_unsold: true, from_pool: 'COUNTER', to_pool: 'SHARED' },
  },
  {
    pt: null,
    type: 'QUOTA',
    priority: 20,
    condition: { minutes_before_departure: { lte: 60 } },
    action: { release_unsold: true, from_pool: 'AGENT', to_pool: 'SHARED' },
  },
];

async function seedRules(ptIds: Record<string, bigint>) {
  for (const r of RULES) {
    const productTypeId = r.pt ? ptIds[r.pt] : null;
    const where = {
      tenantId: null,
      productTypeId,
      ruleType: r.type,
      scopeType: 'PLATFORM',
      scopeId: 0n,
      priority: r.priority,
    };
    const data = { condition: r.condition, action: r.action, isActive: true };
    const found = await prisma.rule.findFirst({ where });
    if (found) await prisma.rule.update({ where: { id: found.id }, data });
    else
      await prisma.rule.create({
        data: {
          ...where,
          ...data,
          validFrom: new Date('2026-01-01T00:00:00Z'),
        },
      });
  }
  log(`${RULES.length} platform rules`);
}

// ---------------------------------------------------------------------------
// 9. NOTIFICATION TEMPLATES (platform default, tenant_id = NULL)
// ---------------------------------------------------------------------------
type Msg = { subject: string; body: string };
const MESSAGES: Record<string, { en_US: Msg; bn_BD: Msg }> = {
  OTP_LOGIN: {
    en_US: {
      subject: 'Your login code',
      body: 'Your login code is {{otp}}. It is valid for {{validity_minutes}} minutes. Do not share it with anyone.',
    },
    bn_BD: {
      subject: 'আপনার লগইন কোড',
      body: 'আপনার লগইন কোড {{otp}}। এটি {{validity_minutes}} মিনিট পর্যন্ত কার্যকর। কাউকে কোডটি জানাবেন না।',
    },
  },
  BOOKING_HELD: {
    en_US: {
      subject: 'Seats reserved for you',
      body: 'Your seats are held for {{hold_minutes}} minutes. Booking ref: {{booking_ref}}. Please complete payment on time.',
    },
    bn_BD: {
      subject: 'আপনার আসন সংরক্ষিত হয়েছে',
      body: 'আপনার আসনগুলো {{hold_minutes}} মিনিটের জন্য সংরক্ষিত আছে। বুকিং রেফ: {{booking_ref}}। অনুগ্রহ করে সময়মতো পেমেন্ট সম্পন্ন করুন।',
    },
  },
  BOOKING_EXPIRED: {
    en_US: {
      subject: 'Booking expired',
      body: 'Booking {{booking_ref}} has expired because payment was not completed.',
    },
    bn_BD: {
      subject: 'বুকিংয়ের মেয়াদ শেষ',
      body: 'পেমেন্ট সম্পন্ন না হওয়ায় বুকিং {{booking_ref}} এর মেয়াদ শেষ হয়েছে।',
    },
  },
  PAYMENT_FAILED: {
    en_US: {
      subject: 'Payment failed',
      body: 'Payment for booking {{booking_ref}} failed. Please try again.',
    },
    bn_BD: {
      subject: 'পেমেন্ট ব্যর্থ হয়েছে',
      body: 'বুকিং {{booking_ref}} এর পেমেন্ট ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
    },
  },
  BOOKING_CONFIRMED: {
    en_US: {
      subject: 'Booking confirmed',
      body: 'Your booking is confirmed. Ref: {{booking_ref}}. Trip: {{route}}, departing {{departure_time}}.',
    },
    bn_BD: {
      subject: 'বুকিং নিশ্চিত হয়েছে',
      body: 'আপনার বুকিং নিশ্চিত হয়েছে। রেফ: {{booking_ref}}। যাত্রা: {{route}}, ছাড়ার সময় {{departure_time}}।',
    },
  },
  TICKET_ISSUED: {
    en_US: {
      subject: 'Your ticket is ready',
      body: 'Ticket no. {{ticket_no}} has been issued. Show the QR code when boarding.',
    },
    bn_BD: {
      subject: 'আপনার টিকিট প্রস্তুত',
      body: 'টিকিট নং {{ticket_no}} ইস্যু করা হয়েছে। যাত্রার সময় QR কোড দেখান।',
    },
  },
  BOOKING_CANCELLED: {
    en_US: {
      subject: 'Booking cancelled',
      body: 'Booking {{booking_ref}} has been cancelled.',
    },
    bn_BD: {
      subject: 'বুকিং বাতিল হয়েছে',
      body: 'আপনার বুকিং {{booking_ref}} বাতিল করা হয়েছে।',
    },
  },
  REFUND_PROCESSED: {
    en_US: {
      subject: 'Refund processed',
      body: 'A refund of {{amount}} {{currency}} for booking {{booking_ref}} has been processed.',
    },
    bn_BD: {
      subject: 'রিফান্ড প্রক্রিয়া সম্পন্ন',
      body: 'বুকিং {{booking_ref}} এর {{amount}} {{currency}} রিফান্ড প্রক্রিয়া করা হয়েছে।',
    },
  },
  TRIP_DELAYED: {
    en_US: {
      subject: 'Your trip is delayed',
      body: 'Trip {{trip_code}} is delayed. New departure time: {{new_departure_time}}.',
    },
    bn_BD: {
      subject: 'আপনার যাত্রা বিলম্বিত',
      body: 'আপনার যাত্রা {{trip_code}} বিলম্বিত হয়েছে। নতুন ছাড়ার সময়: {{new_departure_time}}।',
    },
  },
  TRIP_CANCELLED: {
    en_US: {
      subject: 'Your trip is cancelled',
      body: 'We are sorry, trip {{trip_code}} has been cancelled. Your refund will be processed automatically.',
    },
    bn_BD: {
      subject: 'আপনার যাত্রা বাতিল',
      body: 'দুঃখিত, আপনার যাত্রা {{trip_code}} বাতিল করা হয়েছে। রিফান্ড স্বয়ংক্রিয়ভাবে প্রক্রিয়া করা হবে।',
    },
  },
};

async function ensureTemplate(
  templateType: string,
  eventCode: string,
  locale: string,
  subject: string,
  body: string,
) {
  const where = {
    tenantId: null,
    productTypeId: null,
    templateType,
    eventCode,
    locale,
  };
  const found = await prisma.template.findFirst({ where });
  if (found)
    await prisma.template.update({
      where: { id: found.id },
      data: { subject, body, isActive: true },
    });
  else
    await prisma.template.create({
      data: { ...where, subject, body, isActive: true },
    });
}

async function seedTemplates() {
  let n = 0;
  for (const [eventCode, byLocale] of Object.entries(MESSAGES)) {
    for (const locale of ['en_US', 'bn_BD'] as const) {
      const m = byLocale[locale];
      await ensureTemplate('SMS', eventCode, locale, m.subject, m.body);
      const greeting =
        locale === 'en_US'
          ? 'Hello {{customer_name}},'
          : 'প্রিয় {{customer_name}},';
      await ensureTemplate(
        'EMAIL',
        eventCode,
        locale,
        m.subject,
        `${greeting}\n\n${m.body}`,
      );
      n += 2;
    }
  }
  for (const locale of ['en_US', 'bn_BD']) {
    await ensureTemplate(
      'TICKET_PDF',
      'TICKET_ISSUED',
      locale,
      locale === 'en_US' ? 'E-ticket {{ticket_no}}' : 'ই-টিকিট {{ticket_no}}',
      '<html><body><!-- ticket layout: {{ticket_no}}, {{qr_code}}, {{passenger_name}}, {{route}}, {{seat_label}} --></body></html>',
    );
    await ensureTemplate(
      'INVOICE_PDF',
      'BOOKING_CONFIRMED',
      locale,
      locale === 'en_US'
        ? 'Invoice {{booking_ref}}'
        : 'ইনভয়েস {{booking_ref}}',
      '<html><body><!-- invoice layout: {{booking_ref}}, {{price_lines}}, {{total_amount}} --></body></html>',
    );
    n += 2;
  }
  log(`${n} notification templates`);
}

// ---------------------------------------------------------------------------
// 10. LOCATIONS (global reference data, optional)
// ---------------------------------------------------------------------------
type Loc = {
  code: string;
  name: string;
  type: string;
  lat: string;
  lng: string;
  parent?: string;
};
const LOCATIONS: Loc[] = [
  {
    code: 'DHAKA',
    name: 'Dhaka',
    type: 'CITY',
    lat: '23.8103000',
    lng: '90.4125000',
  },
  {
    code: 'CTG',
    name: 'Chattogram',
    type: 'CITY',
    lat: '22.3569000',
    lng: '91.7832000',
  },
  {
    code: 'SYL',
    name: 'Sylhet',
    type: 'CITY',
    lat: '24.8949000',
    lng: '91.8687000',
  },
  {
    code: 'RAJ',
    name: 'Rajshahi',
    type: 'CITY',
    lat: '24.3745000',
    lng: '88.6042000',
  },
  {
    code: 'KHL',
    name: 'Khulna',
    type: 'CITY',
    lat: '22.8456000',
    lng: '89.5403000',
  },
  {
    code: 'BAR',
    name: 'Barishal',
    type: 'CITY',
    lat: '22.7010000',
    lng: '90.3535000',
  },
  {
    code: 'RNG',
    name: 'Rangpur',
    type: 'CITY',
    lat: '25.7439000',
    lng: '89.2752000',
  },
  {
    code: 'MYM',
    name: 'Mymensingh',
    type: 'CITY',
    lat: '24.7471000',
    lng: '90.4203000',
  },
  {
    code: 'CXB',
    name: "Cox's Bazar",
    type: 'CITY',
    lat: '21.4272000',
    lng: '92.0058000',
  },
  {
    code: 'DHK-GBT',
    name: 'Gabtoli Bus Terminal',
    type: 'TERMINAL',
    lat: '23.7785000',
    lng: '90.3442000',
    parent: 'DHAKA',
  },
  {
    code: 'DHK-SYD',
    name: 'Sayedabad Bus Terminal',
    type: 'TERMINAL',
    lat: '23.7101000',
    lng: '90.4290000',
    parent: 'DHAKA',
  },
  {
    code: 'DHK-KMP',
    name: 'Kamalapur Railway Station',
    type: 'STATION',
    lat: '23.7329000',
    lng: '90.4266000',
    parent: 'DHAKA',
  },
  {
    code: 'DAC',
    name: 'Hazrat Shahjalal International Airport',
    type: 'AIRPORT',
    lat: '23.8433000',
    lng: '90.3978000',
    parent: 'DHAKA',
  },
  {
    code: 'DHK-SDG',
    name: 'Sadarghat Launch Terminal',
    type: 'PORT',
    lat: '23.7060000',
    lng: '90.4060000',
    parent: 'DHAKA',
  },
  {
    code: 'CTG-RLY',
    name: 'Chattogram Railway Station',
    type: 'STATION',
    lat: '22.3300000',
    lng: '91.8317000',
    parent: 'CTG',
  },
  {
    code: 'CGP',
    name: 'Shah Amanat International Airport',
    type: 'AIRPORT',
    lat: '22.2496000',
    lng: '91.8133000',
    parent: 'CTG',
  },
  {
    code: 'SYL-RLY',
    name: 'Sylhet Railway Station',
    type: 'STATION',
    lat: '24.9005000',
    lng: '91.8693000',
    parent: 'SYL',
  },
  {
    code: 'ZYL',
    name: 'Osmani International Airport',
    type: 'AIRPORT',
    lat: '24.9632000',
    lng: '91.8668000',
    parent: 'SYL',
  },
  {
    code: 'CXB-APT',
    name: "Cox's Bazar Airport",
    type: 'AIRPORT',
    lat: '21.4522000',
    lng: '91.9639000',
    parent: 'CXB',
  },
];

async function seedLocations() {
  const ids = new Map<string, bigint>();
  for (const l of LOCATIONS) {
    const parentId = l.parent ? (ids.get(l.parent) ?? null) : null;
    const data = {
      parentId,
      name: l.name,
      locationType: l.type,
      latitude: l.lat,
      longitude: l.lng,
      timezone: 'Asia/Dhaka',
    };
    const found = await prisma.location.findFirst({ where: { code: l.code } });
    const row = found
      ? await prisma.location.update({ where: { id: found.id }, data })
      : await prisma.location.create({ data: { code: l.code, ...data } });
    ids.set(l.code, row.id);
  }
  log(`${LOCATIONS.length} locations`);
}

// ---------------------------------------------------------------------------
// 11. PLATFORM SUPER ADMIN (Tracked)
// ---------------------------------------------------------------------------
async function seedSuperAdmin(roleIds: Record<string, bigint>) {
  const email =
    process.env.SUPERADMIN_EMAIL ?? 'superadmin@platform.example.com';
  const phone = process.env.SUPERADMIN_PHONE ?? '+8801700000000';
  const fullName = process.env.SUPERADMIN_NAME ?? 'Platform Super Admin';
  const password = process.env.SUPERADMIN_PASSWORD ?? 'SuperAdmin@123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  let user = await prisma.staffUser.findFirst({ where: { email } });
  if (!user) {
    user = await prisma.staffUser.create({
      data: {
        email,
        phone,
        fullName,
        passwordHash,
        mfaEnabled: false,
        status: 'ACTIVE',
        lastLoginAt: now,
        lastLoginIp: '127.0.0.1',
        lastActiveAt: now,
        failedLoginAttempts: 0,
      },
    });
  } else {
    user = await prisma.staffUser.update({
      where: { id: user.id },
      data: {
        passwordHash: user.passwordHash ?? passwordHash,
        lastActiveAt: now,
      },
    });
  }
  const roleId = roleIds['Platform Super Admin'];
  const membership = await prisma.membership.findFirst({
    where: { staffUserId: user.id, tenantId: null, branchId: null, roleId },
  });
  if (!membership) {
    await prisma.membership.create({
      data: {
        staffUserId: user.id,
        tenantId: null,
        branchId: null,
        roleId,
        status: 'ACTIVE',
      },
    });
  }
  log(`super admin ${email} (platform-level membership, tracked)`);
  return user;
}

// ---------------------------------------------------------------------------
// 12. DEMO TENANTS & TRACKED TENANT STAFF
// ---------------------------------------------------------------------------
async function seedTenants(
  roleIds: Record<string, bigint>,
  superAdmin: { id: bigint },
  ptIds: Record<string, bigint>,
) {
  const plans = await prisma.plan.findMany();
  const planMap = new Map(plans.map((p) => [p.code, p.id]));

  const defaultPasswordHash = await bcrypt.hash('TenantStaff@123!', 10);
  const now = new Date();

  const DEMO_TENANTS = [
    {
      name: 'Green Line Paribahan',
      domain: 'greenline.fairpath.app',
      planCode: 'ENTERPRISE',
      paymentModel: 'POSTPAID',
      productTypeCode: 'BUS',
      branch: {
        code: 'GL-DHK-01',
        name: 'Arambagh Central Terminal',
        city: 'Dhaka',
        address: '9/2 Outer Circular Road, Arambagh, Motijheel',
        phone: '+88029339623',
      },
      staff: [
        {
          email: 'admin@greenline.example.com',
          fullName: 'Green Line Administrator',
          phone: '+8801711000001',
          roleName: 'Tenant Admin',
          lastLoginAt: new Date(now.getTime() - 2 * 3600 * 1000), // 2 hrs ago
          lastLoginIp: '103.205.71.12',
          lastActiveAt: new Date(now.getTime() - 30 * 60 * 1000),
        },
        {
          email: 'ops@greenline.example.com',
          fullName: 'Rahim Ops Manager',
          phone: '+8801711000002',
          roleName: 'Operations Manager',
          lastLoginAt: new Date(now.getTime() - 24 * 3600 * 1000), // 1 day ago
          lastLoginIp: '103.205.71.15',
          lastActiveAt: new Date(now.getTime() - 23 * 3600 * 1000),
        },
      ],
    },
    {
      name: 'Shohag Elite Travels',
      domain: 'shohag.fairpath.app',
      planCode: 'GROWTH',
      paymentModel: 'PREPAID',
      productTypeCode: 'BUS',
      branch: {
        code: 'SH-DHK-01',
        name: 'Panthapath Premium Counter',
        city: 'Dhaka',
        address: '63/C Lake Circus, Panthapath, Dhaka',
        phone: '+88029134045',
      },
      staff: [
        {
          email: 'admin@shohag.example.com',
          fullName: 'Shohag Administrator',
          phone: '+8801811000001',
          roleName: 'Tenant Admin',
          lastLoginAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000), // 3 days ago
          lastLoginIp: '118.179.44.82',
          lastActiveAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000),
        },
      ],
    },
    {
      name: 'Sundarban Launch & River Cruises',
      domain: 'sundarban.fairpath.app',
      planCode: 'STARTER',
      paymentModel: 'PREPAID',
      productTypeCode: 'LAUNCH',
      branch: {
        code: 'SN-SDR-01',
        name: 'Sadarghat Terminal Gate 3',
        city: 'Dhaka',
        address: 'Sadarghat River Terminal, Old Dhaka',
        phone: '+8801911000001',
      },
      staff: [
        {
          email: 'admin@sundarban.example.com',
          fullName: 'Sundarban Admin',
          phone: '+8801911000002',
          roleName: 'Tenant Admin',
          lastLoginAt: null, // Invited, not logged in yet
          lastLoginIp: null,
          lastActiveAt: null,
        },
      ],
    },
  ];

  for (const t of DEMO_TENANTS) {
    const planId = planMap.get(t.planCode);
    if (!planId) continue;

    let tenant = await prisma.tenant.findFirst({ where: { name: t.name } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: t.name,
          planId,
          status: 'ACTIVE',
          paymentModel: t.paymentModel,
          domain: t.domain,
        },
      });

      // Audit log creation of tenant by super admin
      await prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorType: 'STAFF',
          actorId: superAdmin.id,
          action: 'TENANT_CREATE',
          entityType: 'Tenant',
          entityId: tenant.id,
          diff: { name: t.name, plan: t.planCode, domain: t.domain },
          ipAddress: '127.0.0.1',
          userAgent: 'Fairpath-Admin-Seeder',
        },
      });
    }

    // Link product type
    const productTypeId = ptIds[t.productTypeCode];
    if (productTypeId) {
      await prisma.tenantProductType.upsert({
        where: {
          tenantId_productTypeId: { tenantId: tenant.id, productTypeId },
        },
        update: { isActive: true },
        create: { tenantId: tenant.id, productTypeId, isActive: true },
      });
    }

    // Seed branch
    let branch = await prisma.branch.findFirst({
      where: { tenantId: tenant.id, code: t.branch.code },
    });
    if (!branch) {
      branch = await prisma.branch.create({
        data: {
          tenantId: tenant.id,
          code: t.branch.code,
          name: t.branch.name,
          city: t.branch.city,
          address: t.branch.address,
          phone: t.branch.phone,
        },
      });
    }

    // Seed staff for this tenant with tracking
    for (const s of t.staff) {
      const roleId = roleIds[s.roleName];
      if (!roleId) continue;

      let staffUser = await prisma.staffUser.findFirst({
        where: { email: s.email },
      });
      if (!staffUser) {
        staffUser = await prisma.staffUser.create({
          data: {
            email: s.email,
            phone: s.phone,
            fullName: s.fullName,
            passwordHash: defaultPasswordHash,
            mfaEnabled: false,
            status: 'ACTIVE',
            createdById: superAdmin.id,
            lastLoginAt: s.lastLoginAt,
            lastLoginIp: s.lastLoginIp,
            lastActiveAt: s.lastActiveAt,
            failedLoginAttempts: 0,
          },
        });
      }

      const membership = await prisma.membership.findFirst({
        where: {
          staffUserId: staffUser.id,
          tenantId: tenant.id,
          roleId,
        },
      });
      if (!membership) {
        await prisma.membership.create({
          data: {
            staffUserId: staffUser.id,
            tenantId: tenant.id,
            branchId: branch.id,
            roleId,
            status: 'ACTIVE',
          },
        });
      }
    }
  }

  log(`${DEMO_TENANTS.length} demo tenants with branches and tracked staff`);
}

// ---------------------------------------------------------------------------
async function main() {
  console.log('Seeding configuration data...');
  await seedPlans();
  await seedCurrencies();
  const roleIds = await seedRoles();
  const ptIds = await seedProductTypesAndWorkflows();
  await seedLookups(ptIds);
  await seedAttributes(ptIds);
  await seedPolicies(ptIds);
  await seedRules(ptIds);
  await seedTemplates();
  await seedLocations(); // remove this line if you do not want reference locations
  const superAdmin = await seedSuperAdmin(roleIds);
  await seedTenants(roleIds, superAdmin, ptIds);
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
