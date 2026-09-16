import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

const OPENAPI_PATH = path.resolve('docs', 'openapi.yaml');

/**
 * Swagger UI at /docs and the raw spec at /docs/openapi.json.
 * Has its own helmet config because Swagger UI needs a slightly looser CSP.
 */
export function createDocsRouter() {
  const document = YAML.parse(readFileSync(OPENAPI_PATH, 'utf8'));
  const router = Router();

  router.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          'img-src': ["'self'", 'data:', 'https:'],
          'upgrade-insecure-requests': null,
        },
      },
    }),
  );
  router.get('/openapi.json', (req, res) => res.json(document));
  router.use(
    '/',
    swaggerUi.serve,
    swaggerUi.setup(document, {
      customSiteTitle: 'Threevo API Docs',
      swaggerOptions: { withCredentials: true, persistAuthorization: true },
    }),
  );
  return router;
}
