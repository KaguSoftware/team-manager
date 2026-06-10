import type { Meeting, Project, TaskStatus } from "./database.types";
import type { MemberWithProfile } from "./queries";

// Structural subset of a task row — matches the columns selected by
// useWorkspaceTasks so full Task rows also satisfy it.
export type TaskLite = {
  id: string;
  status: TaskStatus;
  assignee_id: string | null;
  project_id: string;
  due_date: string | null;
  updated_at: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function statusCounts(tasks: TaskLite[]): Record<TaskStatus, number> {
  const counts: Record<TaskStatus, number> = { todo: 0, in_progress: 0, review: 0, done: 0 };
  for (const t of tasks) counts[t.status] += 1;
  return counts;
}

// Done tasks bucketed by local day of updated_at — a completion-time proxy
// (editing a done task later moves it between buckets; acceptable).
export function completionsByDay(
  tasks: TaskLite[],
  days = 14,
  now = new Date(),
): { date: string; label: string; count: number }[] {
  const buckets = new Map<string, number>();
  for (const t of tasks) {
    if (t.status !== "done") continue;
    const key = toLocalDate(new Date(t.updated_at));
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  const out: { date: string; label: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = toLocalDate(d);
    out.push({ date: key, label: String(d.getDate()), count: buckets.get(key) ?? 0 });
  }
  return out;
}

export function projectProgress(
  tasks: TaskLite[],
  projects: Project[],
): { project: Project; done: number; total: number }[] {
  return projects
    .map((project) => {
      const own = tasks.filter((t) => t.project_id === project.id);
      return { project, done: own.filter((t) => t.status === "done").length, total: own.length };
    })
    .sort((a, b) => b.total - a.total);
}

export function memberWorkload(
  tasks: TaskLite[],
  members: MemberWithProfile[],
): { member: MemberWithProfile; open: number }[] {
  return members
    .map((member) => ({
      member,
      open: tasks.filter((t) => t.assignee_id === member.user_id && t.status !== "done").length,
    }))
    .sort((a, b) => b.open - a.open);
}

export function dashboardStats(
  tasks: TaskLite[],
  meetings: Pick<Meeting, "starts_at" | "ends_at">[],
  now = new Date(),
): { open: number; dueThisWeek: number; overdue: number; meetingsToday: number } {
  const today = toLocalDate(now);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = toLocalDate(weekEnd);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59);

  const openTasks = tasks.filter((t) => t.status !== "done");
  return {
    open: openTasks.length,
    dueThisWeek: openTasks.filter(
      (t) => t.due_date !== null && t.due_date >= today && t.due_date <= weekEndStr,
    ).length,
    overdue: openTasks.filter((t) => t.due_date !== null && t.due_date < today).length,
    // Same rule as the Home list: meetings still ongoing or upcoming today.
    meetingsToday: meetings.filter(
      (m) => new Date(m.ends_at) >= now && new Date(m.starts_at) <= endOfDay,
    ).length,
  };
}
