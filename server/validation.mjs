import { z } from 'zod'

// Shared building blocks for request validation. Kept intentionally small —
// this establishes the pattern (used on the highest-risk endpoints: admin
// login, doctor/patient registration and login, booking) rather than
// exhaustively covering every route in one pass.
export const emailSchema = z.string().trim().toLowerCase().email().max(254)
export const nameSchema = z.string().trim().min(1).max(120)
export const phoneSchema = z.string().trim().min(7).max(20)
export const hpcsaNumberSchema = z.string().trim().min(4).max(20)

// Doctors/patients: at least 8 chars (existing rule, kept for compatibility)
// but now also required to mix letters and digits so "12345678" no longer
// passes. Admins get a stricter 12-char minimum since a compromised admin
// account has a much larger blast radius.
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(200)
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
    message: 'Password must contain both letters and numbers',
  })

export const adminPasswordSchema = z
  .string()
  .min(8, 'Admin passwords must be at least 8 characters')
  .max(200)
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
    message: 'Admin passwords must contain both letters and numbers',
  })

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
})

export const doctorRegisterSchema = z.object({
  name: nameSchema,
  credentials: z.string().trim().max(40).optional(),
  specialty: z.string().trim().min(1).max(120),
  email: emailSchema,
  password: passwordSchema,
  hpcsaNumber: hpcsaNumberSchema,
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  bio: z.string().trim().max(2000).optional(),
  insurances: z.array(z.string().trim().max(120)).max(50).optional(),
  acceptsCash: z.boolean().optional(),
})

export const doctorLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
})

export const bookAppointmentSchema = z.object({
  doctorId: z.string().trim().min(1).max(100),
  slotId: z.union([z.number(), z.string()]).transform((v) => Number(v)),
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  reason: z.string().trim().max(1000).optional(),
  newPatient: z.boolean().optional(),
})

// Express middleware factory: validates req.body against `schema`, replacing
// req.body with the parsed (trimmed/coerced) result on success, or replying
// 400 with a readable message on failure. Never throws into the route.
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const message = result.error.issues[0]?.message || 'Invalid request'
      return res.status(400).json({ error: message })
    }
    req.body = result.data
    next()
  }
}
