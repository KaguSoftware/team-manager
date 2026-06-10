import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email");

// mirrors the Supabase Auth dashboard setting (min length 12)
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(72, "Password must be at most 72 characters");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(1, "Enter your name").max(120),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });

export const workspaceSchema = z.object({
  name: z.string().trim().min(1, "Enter a workspace name").max(80),
});

export const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(["admin", "member", "client"]),
});

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Enter a project name").max(120),
  description: z.string().trim().max(5000).default(""),
  status: z.enum(["planning", "active", "on_hold", "completed"]).default("planning"),
  start_date: z.string().nullable().default(null),
  end_date: z.string().nullable().default(null),
});

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Enter a task title").max(200),
  description: z.string().trim().max(10000).default(""),
  status: z.enum(["todo", "in_progress", "review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignee_id: z.string().uuid().nullable().default(null),
  start_date: z.string().nullable().default(null),
  due_date: z.string().nullable().default(null),
  depends_on: z.string().uuid().nullable().default(null),
});

export const ideaSchema = z.object({
  title: z.string().trim().min(1, "Give your idea a title").max(200),
  pitch: z.string().trim().max(10000).default(""),
});

export const commentSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const meetingSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a meeting title").max(200),
    agenda: z.string().trim().max(10000).default(""),
    location: z.string().trim().max(500).default(""),
    starts_at: z.string().min(1, "Pick a start time"),
    ends_at: z.string().min(1, "Pick an end time"),
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), {
    path: ["ends_at"],
    message: "End must be after start",
  });
