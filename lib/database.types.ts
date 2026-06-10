// Hand-maintained database types matching supabase/migrations.
// If the schema changes, regenerate with:
//   npx supabase gen types typescript --project-id <ref> > lib/database.types.ts

export type MemberRole = "owner" | "admin" | "member" | "client";
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type IdeaStatus = "proposed" | "under_review" | "approved" | "rejected";
export type RsvpStatus = "pending" | "yes" | "no" | "maybe";
export type NotificationType =
  | "task_assigned"
  | "meeting_invite"
  | "rsvp_change"
  | "idea_status"
  | "member_joined";

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  expo_push_token: string | null;
  created_at: string;
  updated_at: string;
};

export type Workspace = {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
};

export type WorkspaceMember = {
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
};

export type Invite = {
  id: string;
  workspace_id: string;
  email: string;
  role: MemberRole;
  token_hash: string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type Project = {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  color: string;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  workspace_id: string;
  title: string;
  description: string;
  assignee_id: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  depends_on: string | null;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Idea = {
  id: string;
  workspace_id: string;
  title: string;
  pitch: string;
  status: IdeaStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type IdeaVote = { idea_id: string; user_id: string; created_at: string };

export type IdeaComment = {
  id: string;
  idea_id: string;
  body: string;
  created_by: string;
  created_at: string;
};

export type Meeting = {
  id: string;
  workspace_id: string;
  title: string;
  agenda: string;
  starts_at: string;
  ends_at: string;
  location: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MeetingAttendee = {
  meeting_id: string;
  user_id: string;
  rsvp: RsvpStatus;
  created_at: string;
};

export type AppNotification = {
  id: string;
  user_id: string;
  workspace_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

// FK metadata mirrors Postgres default constraint names (<table>_<col>_fkey)
// so PostgREST embeds like `profiles!ideas_created_by_fkey(...)` type-check.
type RelOf<T extends string, C extends string, R extends string> = {
  foreignKeyName: `${T}_${C}_fkey`;
  columns: [C];
  isOneToOne: false;
  referencedRelation: R;
  referencedColumns: ["id"];
};

type TableShape<
  Row,
  Required extends keyof Row,
  Generated extends keyof Row,
  Rels extends Rel[] = [],
> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required | Generated>>;
  Update: Partial<Omit<Row, Generated>>;
  Relationships: Rels;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableShape<Profile, "id", "created_at" | "updated_at">;
      workspaces: TableShape<
        Workspace,
        "name",
        "id" | "created_at",
        [RelOf<"workspaces", "created_by", "profiles">]
      >;
      workspace_members: TableShape<
        WorkspaceMember,
        "workspace_id" | "user_id",
        "created_at",
        [
          RelOf<"workspace_members", "workspace_id", "workspaces">,
          RelOf<"workspace_members", "user_id", "profiles">,
        ]
      >;
      invites: TableShape<
        Invite,
        "workspace_id" | "email" | "token_hash" | "expires_at",
        "id" | "created_at",
        [
          RelOf<"invites", "workspace_id", "workspaces">,
          RelOf<"invites", "invited_by", "profiles">,
        ]
      >;
      projects: TableShape<
        Project,
        "workspace_id" | "name",
        "id" | "created_at" | "updated_at",
        [
          RelOf<"projects", "workspace_id", "workspaces">,
          RelOf<"projects", "created_by", "profiles">,
        ]
      >;
      tasks: TableShape<
        Task,
        "project_id" | "workspace_id" | "title",
        "id" | "created_at" | "updated_at",
        [
          RelOf<"tasks", "project_id", "projects">,
          RelOf<"tasks", "workspace_id", "workspaces">,
          RelOf<"tasks", "assignee_id", "profiles">,
          RelOf<"tasks", "created_by", "profiles">,
          RelOf<"tasks", "depends_on", "tasks">,
        ]
      >;
      ideas: TableShape<
        Idea,
        "workspace_id" | "title",
        "id" | "created_at" | "updated_at",
        [
          RelOf<"ideas", "workspace_id", "workspaces">,
          RelOf<"ideas", "created_by", "profiles">,
        ]
      >;
      idea_votes: TableShape<
        IdeaVote,
        "idea_id" | "user_id",
        "created_at",
        [
          RelOf<"idea_votes", "idea_id", "ideas">,
          RelOf<"idea_votes", "user_id", "profiles">,
        ]
      >;
      idea_comments: TableShape<
        IdeaComment,
        "idea_id" | "body" | "created_by",
        "id" | "created_at",
        [
          RelOf<"idea_comments", "idea_id", "ideas">,
          RelOf<"idea_comments", "created_by", "profiles">,
        ]
      >;
      meetings: TableShape<
        Meeting,
        "workspace_id" | "title" | "starts_at" | "ends_at",
        "id" | "created_at" | "updated_at",
        [
          RelOf<"meetings", "workspace_id", "workspaces">,
          RelOf<"meetings", "created_by", "profiles">,
        ]
      >;
      meeting_attendees: TableShape<
        MeetingAttendee,
        "meeting_id" | "user_id",
        "created_at",
        [
          RelOf<"meeting_attendees", "meeting_id", "meetings">,
          RelOf<"meeting_attendees", "user_id", "profiles">,
        ]
      >;
      notifications: TableShape<
        AppNotification,
        "user_id" | "type" | "title",
        "id" | "created_at",
        [
          RelOf<"notifications", "user_id", "profiles">,
          RelOf<"notifications", "workspace_id", "workspaces">,
        ]
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_workspace: { Args: { p_name: string }; Returns: string };
      create_invite: {
        Args: { p_workspace: string; p_email: string; p_role?: MemberRole };
        Returns: string;
      };
      accept_invite: { Args: { p_token: string }; Returns: string };
      change_member_role: {
        Args: { p_workspace: string; p_user: string; p_role: MemberRole };
        Returns: undefined;
      };
      remove_member: { Args: { p_workspace: string; p_user: string }; Returns: undefined };
      leave_workspace: { Args: { p_workspace: string }; Returns: undefined };
      revoke_invite: { Args: { p_invite: string }; Returns: undefined };
      delete_account: { Args: Record<string, never>; Returns: undefined };
      is_member: { Args: { p_workspace: string }; Returns: boolean };
      member_role: { Args: { p_workspace: string }; Returns: MemberRole | null };
      shares_workspace_with: { Args: { p_user: string }; Returns: boolean };
    };
    Enums: {
      member_role: MemberRole;
      project_status: ProjectStatus;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      idea_status: IdeaStatus;
      rsvp_status: RsvpStatus;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<string, never>;
  };
};
