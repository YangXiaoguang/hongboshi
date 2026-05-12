import { createHash } from "crypto";
import {
  CourseAccessStateSchema,
  UserAdminMembershipAuditEventSchema,
  createEmptyCourseAccessState,
  normalizeCourseAccessState,
  type CourseAccessState,
  type CourseMembership,
  type Order,
  type OrderItem,
  type UserAdminMembershipAuditEvent,
} from "../../../shared/domain";
import type { DatabaseQueryExecutor } from "../../db/postgres";

type CourseMembershipRow = {
  user_id: string;
  status: CourseMembership["status"];
  plan_name: string | null;
  activated_at: string | Date | null;
  expires_at: string | Date | null;
};

type CourseAccessGrantRow = {
  course_id: number;
};

type OrderRow = {
  id: string;
  user_id: string;
  status: Order["status"];
  subtotal_cents: number;
  discount_cents: number;
  payable_cents: number;
  created_at: string | Date;
  paid_at: string | Date | null;
};

type OrderItemRow = {
  order_id: string;
  type: OrderItem["type"];
  target_id: string;
  title: string;
  unit_price_cents: number;
  quantity: number;
};

type MembershipAuditEventRow = {
  id: string;
  user_id: string;
  actor_id: string;
  actor_roles: string[];
  action: UserAdminMembershipAuditEvent["action"];
  reason: string;
  before_membership: unknown;
  after_membership: unknown;
  created_at: string | Date;
};

function toDateTimeLike(value: string | Date | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

function fromCents(amount: number) {
  return amount / 100;
}

function stableId(prefix: string, ...parts: Array<string | number>) {
  const hash = createHash("sha1")
    .update(parts.join(":"))
    .digest("hex")
    .slice(0, 16);
  return `${prefix}_${hash}`;
}

function membershipRowToDomain(
  row: CourseMembershipRow | undefined
): CourseMembership {
  if (!row) return { status: "none" };

  return {
    status: row.status,
    planName: row.plan_name ?? undefined,
    activatedAt: toDateTimeLike(row.activated_at),
    expiresAt: toDateTimeLike(row.expires_at),
  };
}

function orderRowsToDomain(orders: OrderRow[], items: OrderItemRow[]): Order[] {
  const itemsByOrderId = new Map<string, OrderItem[]>();
  for (const item of items) {
    const orderItems = itemsByOrderId.get(item.order_id) ?? [];
    orderItems.push({
      type: item.type,
      targetId: item.target_id,
      title: item.title,
      unitPrice: fromCents(item.unit_price_cents),
      quantity: item.quantity,
    });
    itemsByOrderId.set(item.order_id, orderItems);
  }

  return orders.map(order => ({
    id: order.id,
    userId: order.user_id,
    status: order.status,
    items: itemsByOrderId.get(order.id) ?? [],
    subtotal: fromCents(order.subtotal_cents),
    discountAmount: fromCents(order.discount_cents),
    payableAmount: fromCents(order.payable_cents),
    createdAt: toDateTimeLike(order.created_at) ?? new Date(0).toISOString(),
    paidAt: toDateTimeLike(order.paid_at),
  }));
}

function membershipAuditEventRowToDomain(
  row: MembershipAuditEventRow
): UserAdminMembershipAuditEvent {
  return UserAdminMembershipAuditEventSchema.parse({
    id: row.id,
    userId: row.user_id,
    actorId: row.actor_id,
    actorRoles: row.actor_roles,
    action: row.action,
    reason: row.reason,
    before: row.before_membership,
    after: row.after_membership,
    createdAt: toDateTimeLike(row.created_at) ?? new Date(0).toISOString(),
  });
}

function sourceOrderIdForCourse(state: CourseAccessState, courseId: number) {
  return (
    state.orders.find(order =>
      order.items.some(
        item => item.type === "course" && item.targetId === String(courseId)
      )
    )?.id ?? null
  );
}

export class PostgresCourseAccessStore {
  constructor(private readonly db: DatabaseQueryExecutor) {}

  async load(userId: string): Promise<CourseAccessState> {
    const [membership, grants, orders, orderItems] = await Promise.all([
      this.db.query<CourseMembershipRow>(
        `
          SELECT
            user_id,
            status,
            plan_name,
            activated_at,
            expires_at
          FROM course_memberships
          WHERE user_id = $1
          LIMIT 1
        `,
        [userId]
      ),
      this.db.query<CourseAccessGrantRow>(
        `
          SELECT course_id
          FROM course_access_grants
          WHERE user_id = $1
            AND revoked_at IS NULL
          ORDER BY granted_at ASC, course_id ASC
        `,
        [userId]
      ),
      this.db.query<OrderRow>(
        `
          SELECT
            id,
            user_id,
            status,
            subtotal_cents,
            discount_cents,
            payable_cents,
            created_at,
            paid_at
          FROM orders
          WHERE user_id = $1
          ORDER BY created_at DESC
        `,
        [userId]
      ),
      this.db.query<OrderItemRow>(
        `
          SELECT
            order_items.order_id,
            order_items.type,
            order_items.target_id,
            order_items.title,
            order_items.unit_price_cents,
            order_items.quantity
          FROM order_items
          INNER JOIN orders
            ON orders.id = order_items.order_id
          WHERE orders.user_id = $1
          ORDER BY order_items.created_at ASC, order_items.id ASC
        `,
        [userId]
      ),
    ]);

    return normalizeCourseAccessState({
      ownedCourseIds: grants.rows.map(row => row.course_id),
      membership: membershipRowToDomain(membership.rows[0]),
      orders: orderRowsToDomain(orders.rows, orderItems.rows),
    });
  }

  async listUserStates(): Promise<
    Array<{ userId: string; state: CourseAccessState }>
  > {
    const result = await this.db.query<{ user_id: string }>(
      `
        SELECT user_id
        FROM course_memberships
        UNION
        SELECT user_id
        FROM course_access_grants
        UNION
        SELECT user_id
        FROM orders
        ORDER BY user_id ASC
      `
    );

    return Promise.all(
      result.rows.map(async row => ({
        userId: row.user_id,
        state: await this.load(row.user_id),
      }))
    );
  }

  async save(
    userId: string,
    state: CourseAccessState
  ): Promise<CourseAccessState> {
    const normalized = CourseAccessStateSchema.parse(
      normalizeCourseAccessState(state)
    );

    await this.db.query(
      `
        INSERT INTO course_memberships (
          user_id,
          status,
          plan_name,
          activated_at,
          expires_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          status = EXCLUDED.status,
          plan_name = EXCLUDED.plan_name,
          activated_at = EXCLUDED.activated_at,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `,
      [
        userId,
        normalized.membership.status,
        normalized.membership.planName ?? null,
        normalized.membership.activatedAt ?? null,
        normalized.membership.expiresAt ?? null,
      ]
    );

    await this.db.query(
      `
        UPDATE course_access_grants
        SET revoked_at = NOW()
        WHERE user_id = $1
          AND revoked_at IS NULL
      `,
      [userId]
    );

    for (const courseId of normalized.ownedCourseIds) {
      await this.db.query(
        `
          INSERT INTO course_access_grants (
            id,
            user_id,
            course_id,
            source_order_id,
            granted_at,
            revoked_at
          )
          VALUES ($1, $2, $3, $4, NOW(), NULL)
          ON CONFLICT (id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            course_id = EXCLUDED.course_id,
            source_order_id = EXCLUDED.source_order_id,
            revoked_at = NULL
        `,
        [
          stableId("grant", userId, courseId),
          userId,
          courseId,
          sourceOrderIdForCourse(normalized, courseId),
        ]
      );
    }

    const orderIds = normalized.orders.map(order => order.id);
    await this.db.query(
      `
        DELETE FROM order_items
        USING orders
        WHERE order_items.order_id = orders.id
          AND orders.user_id = $1
          AND NOT (orders.id = ANY($2::text[]))
      `,
      [userId, orderIds]
    );
    await this.db.query(
      `
        DELETE FROM orders
        WHERE user_id = $1
          AND NOT (id = ANY($2::text[]))
      `,
      [userId, orderIds]
    );

    for (const order of normalized.orders) {
      await this.db.query(
        `
          INSERT INTO orders (
            id,
            user_id,
            status,
            subtotal_cents,
            discount_cents,
            payable_cents,
            created_at,
            paid_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            status = EXCLUDED.status,
            subtotal_cents = EXCLUDED.subtotal_cents,
            discount_cents = EXCLUDED.discount_cents,
            payable_cents = EXCLUDED.payable_cents,
            paid_at = EXCLUDED.paid_at
        `,
        [
          order.id,
          userId,
          order.status,
          toCents(order.subtotal),
          toCents(order.discountAmount),
          toCents(order.payableAmount),
          order.createdAt,
          order.paidAt ?? null,
        ]
      );

      await this.db.query("DELETE FROM order_items WHERE order_id = $1", [
        order.id,
      ]);

      for (let index = 0; index < order.items.length; index += 1) {
        const item = order.items[index];
        if (!item) continue;

        await this.db.query(
          `
            INSERT INTO order_items (
              id,
              order_id,
              type,
              target_id,
              title,
              unit_price_cents,
              quantity
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `,
          [
            stableId("order_item", order.id, index),
            order.id,
            item.type,
            item.targetId,
            item.title,
            toCents(item.unitPrice),
            item.quantity,
          ]
        );
      }
    }

    return normalized;
  }

  async listMembershipAuditEvents(
    userId: string
  ): Promise<UserAdminMembershipAuditEvent[]> {
    const result = await this.db.query<MembershipAuditEventRow>(
      `
        SELECT
          id,
          user_id,
          actor_id,
          actor_roles,
          action,
          reason,
          before_membership,
          after_membership,
          created_at
        FROM user_membership_audit_events
        WHERE user_id = $1
        ORDER BY created_at DESC, id DESC
      `,
      [userId]
    );

    return result.rows.map(membershipAuditEventRowToDomain);
  }

  async appendMembershipAuditEvent(
    event: UserAdminMembershipAuditEvent
  ): Promise<UserAdminMembershipAuditEvent> {
    const normalized = UserAdminMembershipAuditEventSchema.parse(event);
    await this.db.query(
      `
        INSERT INTO user_membership_audit_events (
          id,
          user_id,
          actor_id,
          actor_roles,
          action,
          reason,
          before_membership,
          after_membership,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        normalized.id,
        normalized.userId,
        normalized.actorId,
        normalized.actorRoles,
        normalized.action,
        normalized.reason,
        JSON.stringify(normalized.before),
        JSON.stringify(normalized.after),
        normalized.createdAt,
      ]
    );

    return normalized;
  }

  async reset(
    userId: string,
    state = createEmptyCourseAccessState()
  ): Promise<void> {
    await this.save(userId, state);
  }

  async clear(): Promise<void> {
    await this.db.query("DELETE FROM user_membership_audit_events");
    await this.db.query("DELETE FROM course_access_grants");
    await this.db.query("DELETE FROM course_memberships");
    await this.db.query("DELETE FROM orders");
  }
}
