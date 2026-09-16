import { randomUUID } from 'node:crypto';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { globalLimiter } from './middlewares/rateLimiter.js';
import routes from './routes/index.js';

const REQUEST_ID_PATTERN = /^[\w-]{1,100}$/;

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.TRUST_PROXY);

app.use(
  pinoHttp({
    logger,
    genReqId(req, res) {
      const incoming = req.headers['x-request-id'];
      const id =
        typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    autoLogging: {
      ignore: (req) => req.url.startsWith(`${env.API_PREFIX}/health`),
    },
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url, ip: req.remoteAddress }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    customLogLevel(req, res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  }),
);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Requests without Origin (curl, server-to-server) are allowed.
      callback(null, !origin || env.CORS_ORIGINS.includes(origin));
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use(env.API_PREFIX, globalLimiter, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
