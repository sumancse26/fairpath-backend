/**
 * Demo seed: Multi-Tenant Ticketing and Booking Platform
 *
 * Inserts all platform-level CONFIGURATION data, every lookup value (lookup_mst / lookup_dtl),
 * exactly ONE platform super admin, and a few demo tenants.
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
 *   SUPERADMIN_EMAIL, SUPERADMIN_PHONE, SUPERADMIN_NAME, SUPERADMIN_PASSWORD
 *
 * Conventions:
 *  - Every coded value (status, type, method, channel, role, ...) is a row in lookup_dtl,
 *    grouped by lookup_mst.code. Business tables store only the lookup_dtl.id.
 *  - Seed code resolves ids with lk(GROUP, CODE [, PRODUCT_TYPE]) from an in-memory cache.
 *  - Product-type-specific values (e.g. OFFERING_CLASS for BUS) are lookup_dtl rows with product_type_id set.
 *    lk() prefers the product-type-specific row and falls back to the global row.
 *  - Money amounts (e.g. refund_approval_threshold) are in minor units (poisha for BDT).
 *  - "Platform-level" rows use tenant_id = NULL (roles, rules, templates) or scope type PLATFORM.
 *  - JSON payloads (rule condition/action, attribute validation) still contain readable codes;
 *    they are not relational columns.
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
// 0. LOOKUP ENGINE (lookup_mst / lookup_dtl + id resolver)
// ---------------------------------------------------------------------------
type LV = [code: string, label: string, meta?: Json];
type LookupGroup = { code: string; name: string; values: LV[] };

const lkCache = new Map<string, bigint>();

async function loadLookupCache() {
  const rows = await prisma.lookupDtl.findMany({
    include: { lookupMst: true, productType: true },
  });
  lkCache.clear();
  for (const r of rows) {
    const key = r.productType
      ? `${r.lookupMst.code}:${r.code}:${r.productType.code}`
      : `${r.lookupMst.code}:${r.code}`;
    lkCache.set(key, r.id);
  }
}

/** Resolve a lookup_dtl.id. With `pt`, a product-type-specific value wins over the global one. */
function lk(group: string, code: string, pt?: string): bigint {
  const id =
    (pt ? lkCache.get(`${group}:${code}:${pt}`) : undefined) ??
    lkCache.get(`${group}:${code}`);
  if (id === undefined)
    throw new Error(
      `Lookup not found: ${group}/${code}${pt ? ` (product type ${pt})` : ''}`,
    );
  return id;
}

async function ensureLookup(
  group: string,
  name: string,
  values: LV[],
  productTypeId: bigint | null = null,
) {
  const mst = await prisma.lookupMst.upsert({
    where: { code: group },
    update: { name, isActive: true },
    create: { code: group, name, isSystem: true, isActive: true },
  });
  let order = 10;
  for (const [code, label, meta] of values) {
    const found = await prisma.lookupDtl.findFirst({
      where: { lookupMstId: mst.id, productTypeId, code },
    });
    const metaPart = meta ? { metadata: meta } : {};
    if (found)
      await prisma.lookupDtl.update({
        where: { id: found.id },
        data: { label, sortOrder: order, isActive: true, ...metaPart },
      });
    else
      await prisma.lookupDtl.create({
        data: {
          lookupMstId: mst.id,
          productTypeId,
          code,
          label,
          sortOrder: order,
          isSystem: true,
          isActive: true,
          ...metaPart,
        },
      });
    order += 10;
  }
}

// ---- booking statuses are shared by the lookup seed and the workflow seed ----
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

const GLOBAL_LOOKUPS: LookupGroup[] = [
  // ---------------- Cluster A: tenancy & access ----------------
  {
    code: 'TENANT_STATUS',
    name: 'Tenant status',
    values: [
      ['PENDING', 'Pending'],
      ['ACTIVE', 'Active'],
      ['SUSPENDED', 'Suspended'],
      ['TERMINATED', 'Terminated'],
    ],
  },
  {
    code: 'PAYMENT_MODEL',
    name: 'Tenant payment model',
    values: [
      ['PREPAID', 'Prepaid'],
      ['POSTPAID', 'Postpaid'],
    ],
  },
  {
    code: 'AGENT_STATUS',
    name: 'Agent status',
    values: [
      ['ACTIVE', 'Active'],
      ['SUSPENDED', 'Suspended'],
      ['INACTIVE', 'Inactive'],
    ],
  },
  {
    code: 'STAFF_STATUS',
    name: 'Staff user status',
    values: [
      ['INVITED', 'Invited'],
      ['ACTIVE', 'Active'],
      ['SUSPENDED', 'Suspended'],
      ['LOCKED', 'Locked'],
      ['DISABLED', 'Disabled'],
    ],
  },
  {
    code: 'MEMBERSHIP_STATUS',
    name: 'Membership status',
    values: [
      ['INVITED', 'Invited'],
      ['ACTIVE', 'Active'],
      ['SUSPENDED', 'Suspended'],
      ['REVOKED', 'Revoked'],
    ],
  },
  {
    code: 'AUTH_PROVIDER',
    name: 'Federated login provider',
    values: [
      ['GOOGLE', 'Google'],
      ['FACEBOOK', 'Facebook'],
      ['APPLE', 'Apple'],
      ['MICROSOFT', 'Microsoft'],
    ],
  },
  {
    code: 'KYC_TYPE',
    name: 'KYC type',
    values: [
      ['STAFF', 'Staff'],
      ['TENANT', 'Tenant (business)'],
      ['CUSTOMER', 'Customer'],
    ],
  },
  {
    code: 'KYC_ID_TYPE',
    name: 'KYC ID type',
    values: [
      ['NID', 'National ID'],
      ['PASSPORT', 'Passport'],
      ['DRIVING_LICENSE', 'Driving license'],
      ['TRADE_LICENSE', 'Trade license'],
      ['TIN', 'Tax identification number'],
    ],
  },
  {
    code: 'KYC_STATUS',
    name: 'KYC status',
    values: [
      ['PENDING', 'Pending'],
      ['VERIFIED', 'Verified'],
      ['REJECTED', 'Rejected'],
      ['RESUBMIT_REQUIRED', 'Resubmit required'],
    ],
  },
  {
    code: 'APPROVAL_ACTION_TYPE',
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
    code: 'APPROVAL_STATUS',
    name: 'Approval status',
    values: [
      ['PENDING', 'Pending'],
      ['APPROVED', 'Approved'],
      ['REJECTED', 'Rejected'],
      ['CANCELLED', 'Cancelled'],
    ],
  },
  {
    code: 'ACTOR_TYPE',
    name: 'Audit actor type',
    values: [
      ['STAFF', 'Staff'],
      ['CUSTOMER', 'Customer'],
      ['SYSTEM', 'System'],
      ['API', 'API client'],
    ],
  },
  {
    code: 'AUDIT_ACTION',
    name: 'Audit action',
    values: [
      ['CREATE', 'Create'],
      ['UPDATE', 'Update'],
      ['DELETE', 'Delete'],
      ['LOGIN', 'Login'],
      ['LOGOUT', 'Logout'],
      ['APPROVE', 'Approve'],
      ['REJECT', 'Reject'],
      ['TENANT_CREATE', 'Tenant created'],
      ['TENANT_SUSPEND', 'Tenant suspended'],
    ],
  },
  {
    code: 'ENTITY_TYPE',
    name: 'Entity type',
    values: [
      ['TENANT', 'Tenant'],
      ['STAFF_USER', 'Staff user'],
      ['BRANCH', 'Branch'],
      ['AGENT', 'Agent'],
      ['CUSTOMER_PROFILE', 'Customer profile'],
      ['TRAVELER', 'Traveler'],
      ['OFFERING', 'Offering'],
      ['RESOURCE', 'Resource'],
      ['SERVICE_LINE', 'Service line'],
      ['LOCATION', 'Location'],
      ['LAYOUT_TEMPLATE', 'Layout template'],
      ['TRIP', 'Trip'],
      ['TRIP_UNIT', 'Trip unit'],
      ['BOOKING', 'Booking'],
      ['BOOKING_ITEM', 'Booking item'],
      ['TICKET', 'Ticket'],
      ['PAYMENT', 'Payment'],
      ['REFUND', 'Refund'],
      ['PROMO', 'Promo'],
      ['SETTLEMENT', 'Settlement'],
      ['RULE', 'Rule'],
      ['FARE_RULE', 'Fare rule'],
      ['ROLE', 'Role'],
      ['SUPPLIER_CONNECTION', 'Supplier connection'],
      ['CREW_MEMBER', 'Crew member'],
    ],
  },
  {
    code: 'SCOPE_TYPE',
    name: 'Scope type',
    values: [
      ['PLATFORM', 'Platform'],
      ['TENANT', 'Tenant'],
      ['BRANCH', 'Branch'],
      ['AGENT', 'Agent'],
      ['SERVICE_LINE', 'Service line'],
      ['OFFERING', 'Offering'],
      ['TRIP', 'Trip'],
    ],
  },

  // ---------------- Cluster B: customers & integration ----------------
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
    code: 'COUNTRY',
    name: 'Country (ISO 3166-1 alpha-2)',
    values: [
      ['BD', 'Bangladesh'],
      ['IN', 'India'],
      ['PK', 'Pakistan'],
      ['NP', 'Nepal'],
      ['LK', 'Sri Lanka'],
      ['BT', 'Bhutan'],
      ['MM', 'Myanmar'],
      ['MV', 'Maldives'],
      ['US', 'United States'],
      ['GB', 'United Kingdom'],
      ['CA', 'Canada'],
      ['AU', 'Australia'],
      ['SA', 'Saudi Arabia'],
      ['AE', 'United Arab Emirates'],
      ['QA', 'Qatar'],
      ['KW', 'Kuwait'],
      ['OM', 'Oman'],
      ['BH', 'Bahrain'],
      ['MY', 'Malaysia'],
      ['SG', 'Singapore'],
      ['TH', 'Thailand'],
      ['JP', 'Japan'],
      ['CN', 'China'],
      ['KR', 'South Korea'],
      ['DE', 'Germany'],
      ['FR', 'France'],
      ['IT', 'Italy'],
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
    code: 'DOCUMENT_TYPE',
    name: 'Traveler document type',
    values: [
      ['NID', 'National ID'],
      ['PASSPORT', 'Passport'],
      ['BIRTH_CERTIFICATE', 'Birth certificate'],
    ],
  },
  {
    code: 'API_KEY_TYPE',
    name: 'API key type',
    values: [
      ['PUBLISHABLE', 'Publishable (client-side)'],
      ['SECRET', 'Secret (server-side)'],
      ['AGENT', 'Agent key'],
    ],
  },
  {
    code: 'API_SCOPE',
    name: 'API scope',
    values: [
      ['TRIP_READ', 'Read trips and availability'],
      ['BOOKING_READ', 'Read bookings'],
      ['BOOKING_WRITE', 'Create and modify bookings'],
      ['PAYMENT_READ', 'Read payments'],
      ['TICKET_READ', 'Read tickets'],
      ['WEBHOOK_MANAGE', 'Manage webhooks'],
    ],
  },
  {
    code: 'EVENT_TOPIC',
    name: 'Event topic',
    values: [
      ['BOOKING', 'Booking'],
      ['PAYMENT', 'Payment'],
      ['TICKET', 'Ticket'],
      ['TRIP', 'Trip'],
      ['REFUND', 'Refund'],
      ['SETTLEMENT', 'Settlement'],
      ['NOTIFICATION', 'Notification'],
    ],
  },
  {
    code: 'EVENT_TYPE',
    name: 'Event type',
    values: [
      ['OTP_LOGIN', 'OTP login'],
      ['BOOKING_HELD', 'Booking held'],
      ['BOOKING_EXPIRED', 'Booking expired'],
      ['BOOKING_CONFIRMED', 'Booking confirmed'],
      ['BOOKING_CANCELLED', 'Booking cancelled'],
      ['PAYMENT_CAPTURED', 'Payment captured'],
      ['PAYMENT_FAILED', 'Payment failed'],
      ['TICKET_ISSUED', 'Ticket issued'],
      ['REFUND_PROCESSED', 'Refund processed'],
      ['TRIP_DELAYED', 'Trip delayed'],
      ['TRIP_CANCELLED', 'Trip cancelled'],
      ['TRIP_DEPARTED', 'Trip departed'],
      ['SETTLEMENT_PAID', 'Settlement paid'],
    ],
  },
  {
    code: 'OUTBOX_STATUS',
    name: 'Outbox event status',
    values: [
      ['PENDING', 'Pending'],
      ['PROCESSING', 'Processing'],
      ['SENT', 'Sent'],
      ['FAILED', 'Failed'],
    ],
  },

  // ---------------- Cluster C: registries & rules ----------------
  {
    code: 'INVENTORY_MODEL',
    name: 'Inventory model',
    values: [
      ['SEATED', 'Seated'],
      ['HYBRID', 'Hybrid'],
      ['COUNTED', 'Counted'],
    ],
  },
  {
    code: 'DATA_TYPE',
    name: 'Data type',
    values: [
      ['STRING', 'String'],
      ['NUMBER', 'Number'],
      ['INTEGER', 'Integer'],
      ['PERCENT', 'Percent'],
      ['BOOLEAN', 'Boolean'],
      ['DATE', 'Date'],
      ['ENUM', 'Enum'],
      ['JSON', 'JSON'],
    ],
  },
  {
    code: 'VISIBILITY',
    name: 'Attribute visibility',
    values: [
      ['PUBLIC', 'Public'],
      ['INTERNAL_ONLY', 'Internal only'],
      ['MASKED', 'Masked'],
    ],
  },
  {
    code: 'RULE_TYPE',
    name: 'Rule type',
    values: [
      ['FEE', 'Fee'],
      ['PRICE', 'Price'],
      ['REFUND', 'Refund'],
      ['ELIGIBILITY', 'Eligibility'],
      ['VALIDATION', 'Validation'],
      ['QUOTA', 'Quota'],
    ],
  },
  {
    code: 'TEMPLATE_TYPE',
    name: 'Template type',
    values: [
      ['SMS', 'SMS'],
      ['EMAIL', 'Email'],
      ['TICKET_PDF', 'Ticket PDF'],
      ['INVOICE_PDF', 'Invoice PDF'],
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
  {
    code: 'TIMEZONE',
    name: 'Timezone (IANA)',
    values: [
      ['Asia/Dhaka', 'Dhaka (GMT+6)'],
      ['Asia/Kolkata', 'Kolkata (GMT+5:30)'],
      ['Asia/Riyadh', 'Riyadh (GMT+3)'],
      ['Asia/Dubai', 'Dubai (GMT+4)'],
      ['Asia/Kuala_Lumpur', 'Kuala Lumpur (GMT+8)'],
      ['Europe/London', 'London'],
      ['America/New_York', 'New York'],
      ['UTC', 'UTC'],
    ],
  },

  // ---------------- Cluster D: catalog ----------------
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
    code: 'SELECTION_MODE',
    name: 'Offering selection mode',
    values: [
      ['SEAT_SELECT', 'Customer selects seat'],
      ['AUTO_ASSIGN', 'Auto assign'],
      ['QUANTITY_ONLY', 'Quantity only'],
    ],
  },
  {
    code: 'LAYOUT_STATUS',
    name: 'Layout template status',
    values: [
      ['DRAFT', 'Draft'],
      ['PUBLISHED', 'Published'],
      ['ARCHIVED', 'Archived'],
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
    code: 'SELL_MODE',
    name: 'Sell mode',
    values: [
      ['WHOLE_ONLY', 'Whole unit only'],
      ['PER_PERSON', 'Per person'],
      ['EITHER', 'Either'],
    ],
  },
  {
    code: 'CELL_FLAG',
    name: 'Layout cell flag',
    values: [
      ['LADIES', 'Ladies'],
      ['ACCESSIBLE', 'Accessible'],
      ['EXIT_ROW', 'Exit row'],
      ['EXTRA_LEGROOM', 'Extra legroom'],
      ['BLOCKED', 'Blocked'],
      ['CREW_ONLY', 'Crew only'],
    ],
  },
  {
    code: 'RESOURCE_STATUS',
    name: 'Resource status',
    values: [
      ['ACTIVE', 'Active'],
      ['MAINTENANCE', 'Under maintenance'],
      ['INACTIVE', 'Inactive'],
      ['RETIRED', 'Retired'],
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
    code: 'SERVICE_LINE_STATUS',
    name: 'Service line status',
    values: [
      ['DRAFT', 'Draft'],
      ['ACTIVE', 'Active'],
      ['INACTIVE', 'Inactive'],
    ],
  },
  {
    code: 'PRICE_COMPONENT_TYPE',
    name: 'Fare / price component type',
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

  // ---------------- Cluster E: operations & allocation ----------------
  {
    code: 'TRIP_STATUS',
    name: 'Trip status',
    values: [
      ['SCHEDULED', 'Scheduled'],
      ['OPEN', 'Open for sale'],
      ['CLOSED', 'Sales closed'],
      ['DEPARTED', 'Departed'],
      ['COMPLETED', 'Completed'],
      ['CANCELLED', 'Cancelled'],
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
    code: 'TRIP_UNIT_STATUS',
    name: 'Trip unit status',
    values: [
      ['AVAILABLE', 'Available'],
      ['HELD', 'Held'],
      ['SOLD', 'Sold'],
      ['BLOCKED', 'Blocked'],
      ['CREW', 'Crew'],
    ],
  },
  {
    code: 'ALLOCATION_POOL',
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
    code: 'SPAN_TYPE',
    name: 'Unit span type',
    values: [
      ['HOLD', 'Hold'],
      ['BOOKING', 'Booking'],
      ['BLOCK', 'Block'],
    ],
  },
  {
    code: 'HOLD_STATUS',
    name: 'Hold status',
    values: [
      ['ACTIVE', 'Active'],
      ['CONVERTED', 'Converted to booking'],
      ['EXPIRED', 'Expired'],
      ['RELEASED', 'Released'],
    ],
  },
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
    code: 'ALLOCATION_MODE',
    name: 'Allocation mode',
    values: [
      ['FIXED', 'Fixed quota'],
      ['FLEXIBLE', 'Flexible quota'],
      ['RELEASE_ON_TIME', 'Release on time'],
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

  // ---------------- Cluster F: booking & money ----------------
  {
    code: 'BOOKING_STATUS',
    name: 'Booking status',
    values: BOOKING_STATUSES.map(
      ([c, t]) => [c, STD_LABELS[c], { isTerminal: t }] as LV,
    ),
  },
  {
    code: 'BOOKING_ITEM_TYPE',
    name: 'Booking item type',
    values: [
      ['SEAT', 'Seat / unit'],
      ['ANCILLARY', 'Ancillary'],
      ['FEE', 'Fee'],
    ],
  },
  {
    code: 'BOOKING_ITEM_STATUS',
    name: 'Booking item status',
    values: [
      ['ACTIVE', 'Active'],
      ['BOARDED', 'Boarded'],
      ['CANCELLED', 'Cancelled'],
      ['REFUNDED', 'Refunded'],
    ],
  },
  {
    code: 'TICKET_STATUS',
    name: 'Ticket status',
    values: [
      ['ISSUED', 'Issued'],
      ['USED', 'Used'],
      ['VOID', 'Void'],
      ['REISSUED', 'Reissued'],
      ['EXPIRED', 'Expired'],
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
    code: 'PAYMENT_GATEWAY',
    name: 'Payment gateway',
    values: [
      ['SSLCOMMERZ', 'SSLCommerz'],
      ['BKASH', 'bKash'],
      ['NAGAD', 'Nagad'],
      ['STRIPE', 'Stripe'],
      ['WALLET', 'Internal wallet'],
      ['MANUAL', 'Manual / counter'],
    ],
  },
  {
    code: 'PAYMENT_STATUS',
    name: 'Payment status',
    values: [
      ['INITIATED', 'Initiated'],
      ['PENDING', 'Pending'],
      ['CAPTURED', 'Captured'],
      ['FAILED', 'Failed'],
      ['REFUNDED', 'Refunded'],
      ['PARTIALLY_REFUNDED', 'Partially refunded'],
    ],
  },
  {
    code: 'REFUND_STATUS',
    name: 'Refund status',
    values: [
      ['REQUESTED', 'Requested'],
      ['PENDING_APPROVAL', 'Pending approval'],
      ['APPROVED', 'Approved'],
      ['PROCESSED', 'Processed'],
      ['REJECTED', 'Rejected'],
      ['FAILED', 'Failed'],
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
    code: 'LEDGER_REF_TYPE',
    name: 'Ledger reference type',
    values: [
      ['BOOKING', 'Booking'],
      ['PAYMENT', 'Payment'],
      ['REFUND', 'Refund'],
      ['SETTLEMENT', 'Settlement'],
      ['WALLET', 'Wallet'],
    ],
  },
  {
    code: 'SETTLEMENT_STATUS',
    name: 'Settlement status',
    values: [
      ['DRAFT', 'Draft'],
      ['APPROVED', 'Approved'],
      ['PAID', 'Paid'],
      ['DISPUTED', 'Disputed'],
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
    code: 'NOTIFICATION_STATUS',
    name: 'Notification status',
    values: [
      ['QUEUED', 'Queued'],
      ['SENT', 'Sent'],
      ['DELIVERED', 'Delivered'],
      ['FAILED', 'Failed'],
    ],
  },

  // ---------------- Cluster G: supplier integration ----------------
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
    code: 'CONNECTION_STATUS',
    name: 'Supplier connection status',
    values: [
      ['ACTIVE', 'Active'],
      ['INACTIVE', 'Inactive'],
      ['ERROR', 'Error'],
    ],
  },
  {
    code: 'INTEGRATION_DIRECTION',
    name: 'Integration direction',
    values: [
      ['INBOUND', 'Inbound'],
      ['OUTBOUND', 'Outbound'],
    ],
  },

  // ---------------- Cluster H: crew ----------------
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
    code: 'CREW_STATUS',
    name: 'Crew status',
    values: [
      ['ACTIVE', 'Active'],
      ['ON_LEAVE', 'On leave'],
      ['SUSPENDED', 'Suspended'],
      ['TERMINATED', 'Terminated'],
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
    code: 'LEAVE_STATUS',
    name: 'Leave status',
    values: [
      ['PENDING', 'Pending'],
      ['APPROVED', 'Approved'],
      ['REJECTED', 'Rejected'],
      ['CANCELLED', 'Cancelled'],
    ],
  },
  {
    code: 'DUTY_STATUS',
    name: 'Crew duty status',
    values: [
      ['ASSIGNED', 'Assigned'],
      ['CONFIRMED', 'Confirmed'],
      ['CHECKED_IN', 'Checked in'],
      ['COMPLETED', 'Completed'],
      ['REPLACED', 'Replaced'],
      ['NO_SHOW', 'No-show'],
    ],
  },
];

// product-type-specific lookup values (lookup_dtl.product_type_id is set)
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

const PT_LOOKUPS: { pt: string; group: string; name: string; values: LV[] }[] =
  [
    ...Object.entries(OFFERING_CLASSES).map(([pt, values]) => ({
      pt,
      group: 'OFFERING_CLASS',
      name: 'Offering class',
      values,
    })),
    // Event tickets are "checked in" / "attended" rather than "boarded" / "completed"
    {
      pt: 'EVENT',
      group: 'BOOKING_STATUS',
      name: 'Booking status',
      values: [
        ['BOARDED', 'Checked in', { isTerminal: false }],
        ['COMPLETED', 'Attended', { isTerminal: true }],
      ],
    },
  ];

async function seedGlobalLookups() {
  let total = 0;
  for (const g of GLOBAL_LOOKUPS) {
    await ensureLookup(g.code, g.name, g.values);
    total += g.values.length;
  }
  await loadLookupCache();
  log(
    `${GLOBAL_LOOKUPS.length} lookup groups (lookup_mst), ${total} global values (lookup_dtl)`,
  );
}

async function seedProductTypeLookups(ptIds: Record<string, bigint>) {
  let total = 0;
  for (const l of PT_LOOKUPS) {
    await ensureLookup(l.group, l.name, l.values, ptIds[l.pt]);
    total += l.values.length;
  }
  await loadLookupCache();
  log(`${total} product-type-specific lookup values`);
}

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
  const currencyId = new Map<string, bigint>();
  for (const [code, symbol] of CURRENCIES) {
    const row = await prisma.currency.upsert({
      where: { code },
      update: { symbol },
      create: { code, symbol },
    });
    currencyId.set(code, row.id);
  }
  const now = new Date();
  const fromCurrencyId = currencyId.get('BDT')!;
  for (const [to, rate] of Object.entries(RATES_FROM_BDT)) {
    const toCurrencyId = currencyId.get(to)!;
    const existing = await prisma.exchangeRate.findFirst({
      where: { fromCurrencyId, toCurrencyId },
    });
    if (existing)
      await prisma.exchangeRate.update({
        where: { id: existing.id },
        data: { rate },
      });
    else
      await prisma.exchangeRate.create({
        data: { fromCurrencyId, toCurrencyId, rate, effectiveAt: now },
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

async function seedProductTypes(): Promise<Record<string, bigint>> {
  const ptIds: Record<string, bigint> = {};
  for (const pt of PRODUCT_TYPES) {
    const inventoryModelId = lk('INVENTORY_MODEL', pt.inventoryModel);
    const row = await prisma.productType.upsert({
      where: { code: pt.code },
      update: {
        name: pt.name,
        inventoryModelId,
        config: pt.config,
        isActive: true,
      },
      create: {
        code: pt.code,
        name: pt.name,
        inventoryModelId,
        config: pt.config,
        isActive: true,
      },
    });
    ptIds[pt.code] = row.id;
  }
  log(`${PRODUCT_TYPES.length} product types`);
  return ptIds;
}

type WfDef = { code: string; name: string; productTypeCode: string | null };

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
const WORKFLOWS: WfDef[] = [
  {
    code: 'BOOKING_STD',
    name: 'Standard booking lifecycle',
    productTypeCode: null,
  },
  {
    code: 'BOOKING_EVENT',
    name: 'Event ticket lifecycle',
    productTypeCode: 'EVENT',
  },
];

async function seedWorkflows(ptIds: Record<string, bigint>) {
  const permId = new Map(
    (await prisma.permission.findMany()).map((p) => [p.code, p.id]),
  );
  const wfIds: Record<string, bigint> = {};

  for (const w of WORKFLOWS) {
    const productTypeId = w.productTypeCode ? ptIds[w.productTypeCode] : null;
    // the event workflow resolves BOARDED / COMPLETED to the EVENT-specific lookup rows
    const pt = w.productTypeCode ?? undefined;
    let wf = await prisma.workflow.findFirst({
      where: { code: w.code, productTypeId },
    });
    if (!wf)
      wf = await prisma.workflow.create({
        data: { code: w.code, name: w.name, productTypeId },
      });
    wfIds[w.code] = wf.id;

    for (const [code, isTerminal] of BOOKING_STATUSES) {
      const statusId = lk('BOOKING_STATUS', code, pt);
      await prisma.workflowStatus.upsert({
        where: { workflowId_statusId: { workflowId: wf.id, statusId } },
        update: { isTerminal },
        create: { workflowId: wf.id, statusId, isTerminal },
      });
    }
    for (const [
      fromCode,
      toCode,
      triggerName,
      permCode,
    ] of BOOKING_TRANSITIONS) {
      const requiredPermissionId = permId.get(permCode);
      if (!requiredPermissionId)
        throw new Error(`Unknown permission ${permCode}`);
      const fromStatusId = lk('BOOKING_STATUS', fromCode, pt);
      const toStatusId = lk('BOOKING_STATUS', toCode, pt);
      await prisma.workflowTransition.upsert({
        where: {
          workflowId_fromStatusId_toStatusId: {
            workflowId: wf.id,
            fromStatusId,
            toStatusId,
          },
        },
        update: { triggerName, requiredPermissionId },
        create: {
          workflowId: wf.id,
          fromStatusId,
          toStatusId,
          triggerName,
          requiredPermissionId,
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
}

// ---------------------------------------------------------------------------
// 5. ATTRIBUTE DEFINITIONS
// ---------------------------------------------------------------------------
type Attr = {
  pt: string | null;
  entity: string; // becomes ENTITY_TYPE lookup code (upper-cased)
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
    const entityTypeId = lk('ENTITY_TYPE', a.entity.toUpperCase());
    const data = {
      dataTypeId: lk('DATA_TYPE', a.type),
      validation: a.validation ?? Prisma.JsonNull,
      isRequired: a.required ?? false,
      isSearchable: a.searchable ?? false,
      isEncrypted: a.encrypted ?? false,
      visibilityId: lk('VISIBILITY', a.visibility ?? 'PUBLIC'),
      schemaVersion: 1,
      isActive: true,
    };
    const found = await prisma.attributeDefinition.findFirst({
      where: { productTypeId, entityTypeId, key: a.key },
    });
    if (found)
      await prisma.attributeDefinition.update({
        where: { id: found.id },
        data,
      });
    else
      await prisma.attributeDefinition.create({
        data: { productTypeId, entityTypeId, key: a.key, ...data },
      });
  }
  log(`${ATTRS.length} attribute definitions`);
}

// ---------------------------------------------------------------------------
// 6. POLICY DEFINITIONS
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
      valueTypeId: lk('DATA_TYPE', p.type),
      defaultValue: p.def,
      platformCap: p.cap ?? null,
      allowedScopeIds: p.scopes.map((s) => lk('SCOPE_TYPE', s)),
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
// 7. PLATFORM RULES (tenant_id = NULL, scope = PLATFORM)
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
  const scopeTypeId = lk('SCOPE_TYPE', 'PLATFORM');
  for (const r of RULES) {
    const productTypeId = r.pt ? ptIds[r.pt] : null;
    const where = {
      tenantId: null,
      productTypeId,
      ruleTypeId: lk('RULE_TYPE', r.type),
      scopeTypeId,
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
// 8. NOTIFICATION TEMPLATES (platform default, tenant_id = NULL)
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
    templateTypeId: lk('TEMPLATE_TYPE', templateType),
    eventTypeId: lk('EVENT_TYPE', eventCode),
    localeId: lk('LOCALE', locale),
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
// 9. LOCATIONS (global reference data, optional)
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
  const timezoneId = lk('TIMEZONE', 'Asia/Dhaka');
  for (const l of LOCATIONS) {
    const parentId = l.parent ? (ids.get(l.parent) ?? null) : null;
    const data = {
      parentId,
      name: l.name,
      locationTypeId: lk('LOCATION_TYPE', l.type),
      latitude: l.lat,
      longitude: l.lng,
      timezoneId,
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
// 10. PLATFORM SUPER ADMIN (Tracked)
// ---------------------------------------------------------------------------
async function seedSuperAdmin(roleIds: Record<string, bigint>) {
  const email =
    process.env.SUPERADMIN_EMAIL ?? 'superadmin@platform.example.com';
  const phone = process.env.SUPERADMIN_PHONE ?? '+8801700000000';
  const fullName = process.env.SUPERADMIN_NAME ?? 'Platform Super Admin';
  const password = process.env.SUPERADMIN_PASSWORD ?? 'SuperAdmin@123!';
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const activeStaffId = lk('STAFF_STATUS', 'ACTIVE');

  let user = await prisma.staffUser.findFirst({ where: { email } });
  if (!user) {
    user = await prisma.staffUser.create({
      data: {
        email,
        phone,
        fullName,
        passwordHash,
        mfaEnabled: false,
        statusId: activeStaffId,
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
        statusId: lk('MEMBERSHIP_STATUS', 'ACTIVE'),
      },
    });
  }
  log(`super admin ${email} (platform-level membership, tracked)`);
  return user;
}

// ---------------------------------------------------------------------------
// 11. DEMO TENANTS & TRACKED TENANT STAFF
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
      productTypeCode: 'FERRY', // was 'LAUNCH', which is not a seeded product type
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

  const tenantActiveId = lk('TENANT_STATUS', 'ACTIVE');
  const staffActiveId = lk('STAFF_STATUS', 'ACTIVE');
  const membershipActiveId = lk('MEMBERSHIP_STATUS', 'ACTIVE');

  for (const t of DEMO_TENANTS) {
    const planId = planMap.get(t.planCode);
    if (!planId) continue;

    let tenant = await prisma.tenant.findFirst({ where: { name: t.name } });
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: t.name,
          planId,
          statusId: tenantActiveId,
          paymentModelId: lk('PAYMENT_MODEL', t.paymentModel),
          domain: t.domain,
        },
      });

      // Audit log creation of tenant by super admin
      await prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorTypeId: lk('ACTOR_TYPE', 'STAFF'),
          actorId: superAdmin.id,
          actionId: lk('AUDIT_ACTION', 'TENANT_CREATE'),
          entityTypeId: lk('ENTITY_TYPE', 'TENANT'),
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
            statusId: staffActiveId,
            createdById: superAdmin.id,
            lastLoginAt: s.lastLoginAt,
            lastLoginIp: s.lastLoginIp,
            lastActiveAt: s.lastActiveAt,
            failedLoginAttempts: 0,
          },
        });
      }

      const membership = await prisma.membership.findFirst({
        where: { staffUserId: staffUser.id, tenantId: tenant.id, roleId },
      });
      if (!membership) {
        await prisma.membership.create({
          data: {
            staffUserId: staffUser.id,
            tenantId: tenant.id,
            branchId: branch.id,
            roleId,
            statusId: membershipActiveId,
          },
        });
      }
    }
  }

  log(`${DEMO_TENANTS.length} demo tenants with branches and tracked staff`);
}

// ---------------------------------------------------------------------------
// 12. KYC SUBMISSIONS (Staff & Tenant Verification)
// ---------------------------------------------------------------------------
async function seedKycSubmissions(superAdmin: { id: bigint }) {
  const superAdminUser = await prisma.staffUser.findFirst({
    where: { id: superAdmin.id },
  });
  if (!superAdminUser) return;

  const greenLineTenant = await prisma.tenant.findFirst({
    where: { name: 'Green Line Paribahan' },
  });
  const greenLineAdmin = await prisma.staffUser.findFirst({
    where: { email: 'admin@greenline.example.com' },
  });
  const shohagTenant = await prisma.tenant.findFirst({
    where: { name: 'Shohag Elite Travels' },
  });
  const shohagAdmin = await prisma.staffUser.findFirst({
    where: { email: 'admin@shohag.example.com' },
  });

  const now = new Date();

  const kycStaff = lk('KYC_TYPE', 'STAFF');
  const kycTenant = lk('KYC_TYPE', 'TENANT');
  const idNid = lk('KYC_ID_TYPE', 'NID');
  const idPassport = lk('KYC_ID_TYPE', 'PASSPORT');
  const idTrade = lk('KYC_ID_TYPE', 'TRADE_LICENSE');
  const stVerified = lk('KYC_STATUS', 'VERIFIED');
  const stPending = lk('KYC_STATUS', 'PENDING');

  // 1. Super Admin Platform Staff KYC (Verified)
  const existingSuperAdminKyc = await prisma.kycSubmission.findFirst({
    where: { staffUserId: superAdminUser.id, idTypeId: idNid },
  });
  if (!existingSuperAdminKyc) {
    await prisma.kycSubmission.create({
      data: {
        staffUserId: superAdminUser.id,
        tenantId: null,
        kycTypeId: kycStaff,
        idTypeId: idNid,
        idNumberMasked: '***-***-8801',
        documentUrls: [
          'https://storage.fairpath.internal/kyc/superadmin-nid-front.jpg',
          'https://storage.fairpath.internal/kyc/superadmin-nid-back.jpg',
        ],
        statusId: stVerified,
        reviewedById: superAdminUser.id,
        reviewedAt: now,
        verificationMetadata: {
          issuer: 'Election Commission of Bangladesh',
          matchScore: 99.4,
          ocrStatus: 'SUCCESS',
        },
      },
    });
  }

  // 2. Green Line Tenant Admin KYC (Verified by Super Admin)
  if (greenLineTenant && greenLineAdmin) {
    const existingGlAdminKyc = await prisma.kycSubmission.findFirst({
      where: { staffUserId: greenLineAdmin.id, idTypeId: idPassport },
    });
    if (!existingGlAdminKyc) {
      await prisma.kycSubmission.create({
        data: {
          staffUserId: greenLineAdmin.id,
          tenantId: greenLineTenant.id,
          kycTypeId: kycStaff,
          idTypeId: idPassport,
          idNumberMasked: 'A0***4821',
          documentUrls: [
            'https://storage.fairpath.internal/kyc/greenline-admin-passport.jpg',
          ],
          statusId: stVerified,
          reviewedById: superAdminUser.id,
          reviewedAt: new Date(now.getTime() - 24 * 3600 * 1000),
          verificationMetadata: { country: 'BGD', verifiedBy: 'SuperAdmin' },
        },
      });
    }

    // 3. Green Line Tenant Business KYB/KYC (Trade License)
    const existingGlBusinessKyc = await prisma.kycSubmission.findFirst({
      where: {
        tenantId: greenLineTenant.id,
        kycTypeId: kycTenant,
        idTypeId: idTrade,
      },
    });
    if (!existingGlBusinessKyc) {
      await prisma.kycSubmission.create({
        data: {
          tenantId: greenLineTenant.id,
          kycTypeId: kycTenant,
          idTypeId: idTrade,
          idNumberMasked: 'TRAD/***/**/2024',
          documentUrls: [
            'https://storage.fairpath.internal/kyc/greenline-trade-license.pdf',
          ],
          statusId: stVerified,
          reviewedById: superAdminUser.id,
          reviewedAt: new Date(now.getTime() - 48 * 3600 * 1000),
          verificationMetadata: {
            entityName: 'Green Line Paribahan Ltd',
            tin: '123456789012',
          },
        },
      });
    }
  }

  // 4. Shohag Tenant Admin KYC (Pending Review)
  if (shohagTenant && shohagAdmin) {
    const existingShohagAdminKyc = await prisma.kycSubmission.findFirst({
      where: { staffUserId: shohagAdmin.id, idTypeId: idNid },
    });
    if (!existingShohagAdminKyc) {
      await prisma.kycSubmission.create({
        data: {
          staffUserId: shohagAdmin.id,
          tenantId: shohagTenant.id,
          kycTypeId: kycStaff,
          idTypeId: idNid,
          idNumberMasked: '***-***-7124',
          documentUrls: [
            'https://storage.fairpath.internal/kyc/shohag-admin-nid.jpg',
          ],
          statusId: stPending,
          verificationMetadata: { submittedVia: 'WEB_PORTAL' },
        },
      });
    }
  }

  log('sample KYC submissions (platform staff, tenant staff, and tenant KYB)');
}

// ---------------------------------------------------------------------------
async function main() {
  console.log('Seeding configuration data...');
  await seedGlobalLookups(); // must run first: everything below resolves ids via lk()
  await seedPlans();
  await seedCurrencies();
  const roleIds = await seedRoles();
  const ptIds = await seedProductTypes();
  await seedProductTypeLookups(ptIds); // needs product type ids
  await seedWorkflows(ptIds); // needs BOOKING_STATUS lookups (incl. EVENT overrides)
  await seedAttributes(ptIds);
  await seedPolicies(ptIds);
  await seedRules(ptIds);
  await seedTemplates();
  await seedLocations(); // remove this line if you do not want reference locations
  const superAdmin = await seedSuperAdmin(roleIds);
  await seedTenants(roleIds, superAdmin, ptIds);
  await seedKycSubmissions(superAdmin);
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
