import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  IdeaStatus,
  MemberRole,
  Profile,
  RsvpStatus,
  TaskStatus,
} from "./database.types";
import { supabase } from "./supabase";

function throwIfError<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

// ---------------------------------------------------------------------------
// Workspaces & membership
// ---------------------------------------------------------------------------
export function useMyWorkspaces() {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async () =>
      throwIfError(
        await supabase
          .from("workspaces")
          .select("*, workspace_members(role, user_id)")
          .order("created_at"),
      ),
  });
}

export function useMyRole(workspaceId: string | null) {
  return useQuery({
    queryKey: ["my-role", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const data = throwIfError(
        await supabase.rpc("member_role", { p_workspace: workspaceId! }),
      );
      return (data ?? null) as MemberRole | null;
    },
  });
}

export type MemberWithProfile = {
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
  profiles: Pick<Profile, "id" | "full_name" | "avatar_url"> | null;
};

export function useMembers(workspaceId: string | null) {
  return useQuery({
    queryKey: ["members", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () =>
      throwIfError(
        await supabase
          .from("workspace_members")
          .select("*, profiles:profiles!workspace_members_user_id_fkey(id, full_name, avatar_url)")
          .eq("workspace_id", workspaceId!)
          .order("created_at"),
      ) as unknown as MemberWithProfile[],
  });
}

export function useWorkspaceMutations(workspaceId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["members", workspaceId] });
    qc.invalidateQueries({ queryKey: ["workspaces"] });
    qc.invalidateQueries({ queryKey: ["invites", workspaceId] });
  };

  const createWorkspace = useMutation({
    mutationFn: async (name: string) =>
      throwIfError(await supabase.rpc("create_workspace", { p_name: name })),
    onSuccess: invalidate,
  });

  const acceptInvite = useMutation({
    mutationFn: async (token: string) =>
      throwIfError(await supabase.rpc("accept_invite", { p_token: token.trim() })),
    onSuccess: invalidate,
  });

  const createInvite = useMutation({
    mutationFn: async (args: { email: string; role: MemberRole }) =>
      throwIfError(
        await supabase.rpc("create_invite", {
          p_workspace: workspaceId!,
          p_email: args.email,
          p_role: args.role,
        }),
      ),
    onSuccess: invalidate,
  });

  const changeRole = useMutation({
    mutationFn: async (args: { userId: string; role: MemberRole }) =>
      throwIfError(
        await supabase.rpc("change_member_role", {
          p_workspace: workspaceId!,
          p_user: args.userId,
          p_role: args.role,
        }),
      ),
    onSuccess: invalidate,
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) =>
      throwIfError(
        await supabase.rpc("remove_member", { p_workspace: workspaceId!, p_user: userId }),
      ),
    onSuccess: invalidate,
  });

  const leaveWorkspace = useMutation({
    mutationFn: async () =>
      throwIfError(await supabase.rpc("leave_workspace", { p_workspace: workspaceId! })),
    onSuccess: invalidate,
  });

  return { createWorkspace, acceptInvite, createInvite, changeRole, removeMember, leaveWorkspace };
}

export function usePendingInvites(workspaceId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["invites", workspaceId],
    enabled: !!workspaceId && enabled,
    queryFn: async () =>
      throwIfError(
        await supabase
          .from("invites")
          .select("id, email, role, expires_at, accepted_at")
          .eq("workspace_id", workspaceId!)
          .is("accepted_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false }),
      ),
  });
}

// ---------------------------------------------------------------------------
// Projects & tasks
// ---------------------------------------------------------------------------
export function useProjects(workspaceId: string | null) {
  return useQuery({
    queryKey: ["projects", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () =>
      throwIfError(
        await supabase
          .from("projects")
          .select("*")
          .eq("workspace_id", workspaceId!)
          .order("created_at", { ascending: false }),
      ),
  });
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ["project", projectId],
    enabled: !!projectId,
    queryFn: async () =>
      throwIfError(
        await supabase.from("projects").select("*").eq("id", projectId!).single(),
      ),
  });
}

export function useTasks(projectId: string | null) {
  return useQuery({
    queryKey: ["tasks", projectId],
    enabled: !!projectId,
    queryFn: async () =>
      throwIfError(
        await supabase
          .from("tasks")
          .select("*")
          .eq("project_id", projectId!)
          .order("sort_order")
          .order("created_at"),
      ),
  });
}

export function useMyTasks(workspaceId: string | null, userId: string | null) {
  return useQuery({
    queryKey: ["my-tasks", workspaceId, userId],
    enabled: !!workspaceId && !!userId,
    queryFn: async () =>
      throwIfError(
        await supabase
          .from("tasks")
          .select("*, projects(name, color)")
          .eq("workspace_id", workspaceId!)
          .eq("assignee_id", userId!)
          .neq("status", "done")
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(10),
      ),
  });
}

// ---------------------------------------------------------------------------
// Ideas
// ---------------------------------------------------------------------------
export function useIdeas(workspaceId: string | null) {
  return useQuery({
    queryKey: ["ideas", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () =>
      throwIfError(
        await supabase
          .from("ideas")
          .select("*, idea_votes(user_id), profiles:profiles!ideas_created_by_fkey(full_name)")
          .eq("workspace_id", workspaceId!)
          .order("created_at", { ascending: false }),
      ),
  });
}

export function useIdeaMutations(workspaceId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ideas", workspaceId] });

  const vote = useMutation({
    mutationFn: async (args: { ideaId: string; userId: string; voted: boolean }) => {
      if (args.voted) {
        throwIfError(
          await supabase
            .from("idea_votes")
            .delete()
            .eq("idea_id", args.ideaId)
            .eq("user_id", args.userId),
        );
      } else {
        throwIfError(
          await supabase
            .from("idea_votes")
            .insert({ idea_id: args.ideaId, user_id: args.userId }),
        );
      }
    },
    onSuccess: invalidate,
  });

  const setStatus = useMutation({
    mutationFn: async (args: { ideaId: string; status: IdeaStatus }) =>
      throwIfError(
        await supabase.from("ideas").update({ status: args.status }).eq("id", args.ideaId),
      ),
    onSuccess: invalidate,
  });

  return { vote, setStatus };
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------
export function useMeetings(workspaceId: string | null) {
  return useQuery({
    queryKey: ["meetings", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () =>
      throwIfError(
        await supabase
          .from("meetings")
          .select("*, meeting_attendees(user_id, rsvp)")
          .eq("workspace_id", workspaceId!)
          .order("starts_at"),
      ),
  });
}

export function useRsvp(workspaceId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { meetingId: string; userId: string; rsvp: RsvpStatus }) =>
      throwIfError(
        await supabase
          .from("meeting_attendees")
          .update({ rsvp: args.rsvp })
          .eq("meeting_id", args.meetingId)
          .eq("user_id", args.userId),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings", workspaceId] }),
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () =>
      throwIfError(
        await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
      ),
  });
}

export function useNotificationMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications"] });

  const markRead = useMutation({
    mutationFn: async (id: string) =>
      throwIfError(
        await supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", id),
      ),
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: async () =>
      throwIfError(
        await supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .is("read_at", null),
      ),
    onSuccess: invalidate,
  });

  return { markRead, markAllRead };
}

export const statusTone = {
  todo: "gray",
  in_progress: "blue",
  review: "amber",
  done: "green",
  planning: "gray",
  active: "blue",
  on_hold: "amber",
  completed: "green",
  proposed: "gray",
  under_review: "amber",
  approved: "green",
  rejected: "red",
} as const;

export const taskStatuses: TaskStatus[] = ["todo", "in_progress", "review", "done"];
