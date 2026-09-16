import { formatZodIssues } from '../config/zod.js';
import { ValidationError } from '../utils/AppError.js';

const LOCATIONS = ['params', 'query', 'body'];

/**
 * Validate request parts with Zod schemas.
 * Parsed values (unknown keys stripped, coerced, defaults applied) are stored in
 * `req.validated.{params,query,body}` because `req.query` is read-only in Express 5.
 *
 * @example router.post('/', validate({ body: createSchema }), controller.create)
 */
export function validate(schemas) {
  return (req, res, next) => {
    req.validated ??= {};
    const details = [];

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location] ?? {});
      if (result.success) {
        req.validated[location] = result.data;
      } else {
        details.push(...formatZodIssues(result.error.issues, location));
      }
    }

    if (details.length) throw new ValidationError(undefined, details);
    next();
  };
}
