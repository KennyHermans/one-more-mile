// Input sanitization utilities to prevent XSS and injection attacks

export const sanitizeHtml = (input: string): string => {
  // Remove any potentially dangerous HTML tags and attributes
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '') // Remove iframe tags
    .replace(/<object[\s\S]*?<\/object>/gi, '') // Remove object tags
    .replace(/<embed[\s\S]*?<\/embed>/gi, '') // Remove embed tags
    .replace(/<form[\s\S]*?<\/form>/gi, '') // Remove form tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/on\w+='[^']*'/gi, '') // Remove event handlers with single quotes
    .trim();
};

export const sanitizeText = (input: string, maxLength = 1000): string => {
  return input
    .replace(/[<>'"]/g, '') // Remove basic HTML chars
    .trim()
    .substring(0, maxLength);
};

export const sanitizeEmail = (email: string): string => {
  return email
    .toLowerCase()
    .trim()
    .substring(0, 254); // RFC 5321 limit
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
};

export const sanitizeNumeric = (value: any, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  const num = parseInt(String(value));
  if (isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
};