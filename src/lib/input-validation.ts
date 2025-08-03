import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

const phoneSchema = z.string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
  .min(10, 'Phone number must be at least 10 digits');

// Sanitization functions
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};

export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Auth form validation schemas
export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required')
});

// Profile validation schemas
export const customerProfileSchema = z.object({
  full_name: nameSchema,
  phone: phoneSchema.optional(),
  emergency_contact_name: nameSchema.optional(),
  emergency_contact_phone: phoneSchema.optional(),
  medical_conditions: z.string().max(1000, 'Medical conditions must be less than 1000 characters').optional(),
  dietary_restrictions: z.string().max(1000, 'Dietary restrictions must be less than 1000 characters').optional()
});

export const senseiProfileSchema = z.object({
  name: nameSchema,
  bio: z.string()
    .min(50, 'Bio must be at least 50 characters')
    .max(2000, 'Bio must be less than 2000 characters'),
  experience: z.string()
    .min(20, 'Experience description must be at least 20 characters')
    .max(1000, 'Experience description must be less than 1000 characters'),
  location: z.string()
    .min(2, 'Location must be at least 2 characters')
    .max(100, 'Location must be less than 100 characters'),
  specialty: z.string()
    .min(2, 'Specialty must be at least 2 characters')
    .max(100, 'Specialty must be less than 100 characters'),
  specialties: z.array(z.string()).min(1, 'At least one specialty is required'),
  certifications: z.array(z.string()).optional(),
  unavailable_months: z.array(z.string()).optional()
});

// Contact form validation
export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: z.string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject must be less than 200 characters'),
  message: z.string()
    .min(20, 'Message must be at least 20 characters')
    .max(2000, 'Message must be less than 2000 characters')
});

// Trip creation validation
export const tripCreationSchema = z.object({
  title: z.string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .min(100, 'Description must be at least 100 characters')
    .max(5000, 'Description must be less than 5000 characters'),
  destination: z.string()
    .min(2, 'Destination must be at least 2 characters')
    .max(100, 'Destination must be less than 100 characters'),
  price: z.string()
    .regex(/^\d+(\.\d{2})?$/, 'Price must be a valid amount (e.g., 99.99)'),
  dates: z.string()
    .min(5, 'Dates must be specified')
    .max(100, 'Dates description too long'),
  group_size: z.string()
    .min(3, 'Group size must be specified')
    .max(50, 'Group size description too long'),
  theme: z.string()
    .min(2, 'Theme must be specified')
    .max(50, 'Theme too long'),
  difficulty_level: z.enum(['Easy', 'Moderate', 'Challenging', 'Expert']),
  duration_days: z.number()
    .min(1, 'Duration must be at least 1 day')
    .max(365, 'Duration cannot exceed 365 days'),
  max_participants: z.number()
    .min(1, 'Must allow at least 1 participant')
    .max(50, 'Cannot exceed 50 participants')
});

// Admin action validation
export const adminActionSchema = z.object({
  action: z.string().min(1, 'Action is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

// Export type helpers
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type CustomerProfileFormData = z.infer<typeof customerProfileSchema>;
export type SenseiProfileFormData = z.infer<typeof senseiProfileSchema>;
export type ContactFormData = z.infer<typeof contactFormSchema>;
export type TripCreationFormData = z.infer<typeof tripCreationSchema>;
export type AdminActionFormData = z.infer<typeof adminActionSchema>;