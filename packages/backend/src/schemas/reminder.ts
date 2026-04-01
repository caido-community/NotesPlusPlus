import { z } from "zod";

export const createReminderSchema = z.object({
  notePath: z.string().min(1),
  context: z.string(),
  reminderAt: z.string().min(1),
});

export const deleteReminderSchema = z.object({
  reminderId: z.string().min(1),
});

export const dismissReminderSchema = z.object({
  reminderId: z.string().min(1),
});
