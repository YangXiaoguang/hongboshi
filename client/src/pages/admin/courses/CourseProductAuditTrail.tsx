import { History } from "lucide-react";
import type { CourseProductAuditEvent } from "@shared/domain";
import {
  courseProductAuditActionLabel,
  courseProductAuditChangeText,
  formatCourseProductDate,
} from "./courseProductListPresentation";

export function CourseProductAuditTrail({
  events,
}: {
  events: CourseProductAuditEvent[];
}) {
  const recentEvents = events.slice(0, 5);

  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-[#E1D7C8] bg-[#FFFDF8] shadow-sm shadow-[#243B35]/5">
      <div className="flex items-center justify-between border-b border-[#E8DED0] px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4 text-[#6F8F83]" />
          最近审计
        </div>
        <span className="rounded-full bg-[#F1E8DC] px-2.5 py-1 text-xs font-semibold text-[#756B60]">
          {events.length} 条
        </span>
      </div>

      {recentEvents.length ? (
        <div className="divide-y divide-[#E8DED0]">
          {recentEvents.map(event => (
            <div
              key={event.id}
              className="grid gap-3 px-5 py-3 text-sm md:grid-cols-[140px_minmax(0,1fr)_180px]"
            >
              <div>
                <p className="font-semibold text-[#243B35]">
                  {courseProductAuditActionLabel(event.action)}
                </p>
                <p className="mt-1 text-xs text-[#8A8176]">
                  {formatCourseProductDate(event.createdAt)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[#41524B]">
                  {event.productTitle}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#8A8176]">
                  {courseProductAuditChangeText(event)} · {event.reason}
                </p>
              </div>
              <p className="text-xs text-[#8A8176]">操作者 {event.actorId}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[116px] items-center justify-center px-5 text-sm text-[#8A8176]">
          本轮还没有课程商品操作记录
        </div>
      )}
    </section>
  );
}
