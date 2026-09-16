import { z } from 'zod';

// Validation messages in Indonesian for every schema in the app.
z.config(z.locales.id());

/**
 * Convert Zod issues into the `details` array of the standard error response.
 * @param {import('zod').core.$ZodIssue[]} issues
 * @param {string} [location] body | query | params
 */
export function formatZodIssues(issues, location) {
  return issues.map((issue) => ({
    ...(location && { location }),
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

export { z };
