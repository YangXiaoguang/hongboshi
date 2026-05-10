export type DatabaseDomain =
  | "auth"
  | "commerce"
  | "assessment"
  | "counseling"
  | "risk"
  | "audit";

export type CoreDatabaseTable = {
  name: string;
  domain: DatabaseDomain;
  purpose: string;
  requiredColumns: readonly string[];
};

export const coreDatabaseTables = [
  {
    name: "users",
    domain: "auth",
    purpose: "Stable user profile and privacy-minimized identity fields.",
    requiredColumns: [
      "id",
      "display_name",
      "phone_masked",
      "avatar_url",
      "is_minor",
      "created_at",
      "updated_at",
    ],
  },
  {
    name: "user_roles",
    domain: "auth",
    purpose: "RBAC role assignments kept separate from the user profile.",
    requiredColumns: ["user_id", "role", "created_at"],
  },
  {
    name: "user_consents",
    domain: "auth",
    purpose: "Terms and privacy consent audit trail by version.",
    requiredColumns: ["user_id", "type", "version", "accepted_at"],
  },
  {
    name: "auth_sessions",
    domain: "auth",
    purpose: "Server-side session metadata and token hashes.",
    requiredColumns: [
      "id",
      "user_id",
      "provider",
      "token_hash",
      "expires_at",
      "revoked_at",
      "created_at",
    ],
  },
  {
    name: "course_memberships",
    domain: "commerce",
    purpose: "Course membership entitlement snapshot per user.",
    requiredColumns: [
      "user_id",
      "status",
      "plan_name",
      "activated_at",
      "expires_at",
      "updated_at",
    ],
  },
  {
    name: "course_access_grants",
    domain: "commerce",
    purpose: "Owned course grants derived from purchase or manual operations.",
    requiredColumns: [
      "id",
      "user_id",
      "course_id",
      "source_order_id",
      "granted_at",
      "revoked_at",
    ],
  },
  {
    name: "orders",
    domain: "commerce",
    purpose: "Payable order header for courses, memberships and counseling.",
    requiredColumns: [
      "id",
      "user_id",
      "status",
      "subtotal_cents",
      "discount_cents",
      "payable_cents",
      "created_at",
      "paid_at",
    ],
  },
  {
    name: "order_items",
    domain: "commerce",
    purpose: "Order line items mapped from shared OrderItem.",
    requiredColumns: [
      "id",
      "order_id",
      "type",
      "target_id",
      "title",
      "unit_price_cents",
      "quantity",
      "created_at",
    ],
  },
  {
    name: "payments",
    domain: "commerce",
    purpose: "Payment attempts and provider transaction ids.",
    requiredColumns: [
      "id",
      "order_id",
      "channel",
      "amount_cents",
      "transaction_id",
      "paid_at",
      "created_at",
    ],
  },
  {
    name: "assessment_reports",
    domain: "assessment",
    purpose: "Generated assessment report, scores and recommendations.",
    requiredColumns: [
      "id",
      "user_id",
      "flow_id",
      "dimensions",
      "risk_level",
      "summary",
      "recommendations",
      "risk_event_id",
      "created_at",
    ],
  },
  {
    name: "counselors",
    domain: "counseling",
    purpose: "Counselor public profile and service pricing metadata.",
    requiredColumns: [
      "id",
      "name",
      "avatar_url",
      "title",
      "introduction",
      "specialties",
      "license_summary",
      "years_of_practice",
      "session_price_cents",
      "rating",
      "status",
      "created_at",
      "updated_at",
    ],
  },
  {
    name: "counseling_slots",
    domain: "counseling",
    purpose: "Bookable counselor time slots.",
    requiredColumns: [
      "id",
      "counselor_id",
      "starts_at",
      "ends_at",
      "channel",
      "available",
      "created_at",
      "updated_at",
    ],
  },
  {
    name: "counseling_appointments",
    domain: "counseling",
    purpose: "User counseling appointment and intake metadata.",
    requiredColumns: [
      "id",
      "user_id",
      "counselor_id",
      "slot_id",
      "order_id",
      "channel",
      "status",
      "concern_tags",
      "note_for_counselor",
      "assessment_report_id",
      "risk_event_id",
      "created_at",
      "updated_at",
    ],
  },
  {
    name: "risk_events",
    domain: "risk",
    purpose:
      "Open, reviewed and resolved risk events from assessment or intake.",
    requiredColumns: [
      "id",
      "user_id",
      "source",
      "risk_level",
      "signal",
      "status",
      "reviewer_id",
      "created_at",
      "resolved_at",
    ],
  },
  {
    name: "audit_logs",
    domain: "audit",
    purpose: "Append-only operational audit trail.",
    requiredColumns: [
      "id",
      "actor_id",
      "action",
      "resource_type",
      "resource_id",
      "ip",
      "user_agent",
      "created_at",
    ],
  },
] as const satisfies readonly CoreDatabaseTable[];

export const requiredDatabaseIndexes = [
  "idx_auth_sessions_user_id",
  "idx_course_access_grants_user_id",
  "idx_orders_user_id_created_at",
  "idx_assessment_reports_user_id_created_at",
  "idx_counseling_slots_counselor_starts_at",
  "idx_counseling_appointments_user_id_created_at",
  "idx_counseling_appointments_order_id",
  "idx_risk_events_user_status",
  "idx_audit_logs_resource",
] as const;
