import { z } from "zod";

export const personName = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine(
    (v) => !/[\u0000-\u001f\u007f]/.test(v),
    "Names cannot contain control characters.",
  );
export const phoneSchema = z
  .string()
  .trim()
  .max(40)
  .refine(
    (v) =>
      !v ||
      (/^[+\d\s().-]+$/.test(v) &&
        v.replace(/\D/g, "").length >= 7 &&
        v.replace(/\D/g, "").length <= 15),
    "Enter a valid phone number, including country code.",
  );
export const emailSchema = z
  .union([z.email().max(254), z.literal("")])
  .transform((v) => v.trim().toLowerCase());
export const lookupSchema = z
  .object({
    firstName: personName,
    lastName: personName,
    verification: z.string().trim().min(1).max(254).optional(),
  })
  .strict();
export const responseSchema = z
  .object({
    guestId: z.uuid(),
    attending: z.boolean(),
    dietaryRestrictions: z.string().trim().max(1000).default(""),
    firstName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().max(100).optional(),
    adultConfirmed: z.literal(true).optional(),
  })
  .strict();
export const submitSchema = z
  .object({ responses: z.array(responseSchema).min(1).max(50) })
  .strict();
export const householdSchema = z
  .object({
    id: z.uuid().optional(),
    displayName: z.string().trim().min(1).max(150),
    primaryEmail: emailSchema.optional(),
    primaryPhone: phoneSchema.optional(),
  })
  .strict();
export const guestSchema = z
  .object({
    id: z.uuid().optional(),
    householdId: z.uuid(),
    firstName: personName,
    lastName: personName,
    plusOneAllowed: z.boolean().default(false),
    adultConfirmed: z.literal(true),
  })
  .strict();
export const manualRsvpSchema = z
  .object({
    guestId: z.uuid(),
    attending: z.boolean(),
    dietaryRestrictions: z.string().trim().max(1000).default(""),
  })
  .strict();
