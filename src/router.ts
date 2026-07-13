import express, { type NextFunction, type Request, type Response, type Router } from 'express';
import { Type } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import type { ResolveWowContext, WowRequestContext } from './adapter';
import { UnauthorizedError, WowError } from './errors';
import { schemas } from './schemas';
import { wowRoutes } from './routes';

const V1_PREFIX = '/v1';

export interface CreateWowRouterOptions {
  resolveContext: ResolveWowContext;
  validateResponses?: boolean;
  onError?: (error: Error, request: Request) => void;
}

declare global {
  namespace Express {
    interface Request {
      wowContext?: WowRequestContext;
    }
  }
}

function validationMessage(schema: Parameters<typeof Value.Errors>[0], value: unknown): string {
  const first = Value.Errors(schema, value).First();
  return first ? `${first.path || 'value'} ${first.message}` : 'does not match schema';
}

export function createWowRouter(options: CreateWowRouterOptions): Router {
  const router = express.Router();
  const v1Router = express.Router();
  const validateResponses = options.validateResponses ?? process.env.NODE_ENV !== 'production';

  v1Router.use(async (request, _response, next) => {
    try {
      const context = await options.resolveContext({
        authorization: request.get('Authorization'),
        request
      });
      if (!context) throw new UnauthorizedError();
      request.wowContext = context;
      next();
    } catch (error) {
      next(error);
    }
  });

  for (const definition of wowRoutes) {
    v1Router[definition.method](definition.path, async (request, response, next) => {
      try {
        if (definition.bodySchema && !Value.Check(definition.bodySchema, request.body)) {
          throw new WowError(`Invalid request body: ${validationMessage(definition.bodySchema, request.body)}`, 400);
        }

        const data = await definition.run(request.wowContext!, request);
        if (validateResponses) {
          const baseSchema = schemas[definition.response];
          const responseSchema = definition.responseArray ? Type.Array(baseSchema) : baseSchema;
          if (!Value.Check(responseSchema, data)) {
            throw new WowError(`Adapter response does not match ${definition.response}: ${validationMessage(responseSchema, data)}`, 500);
          }
        }
        response.status(200).json({ code: 200, data });
      } catch (error) {
        next(error);
      }
    });
  }

  v1Router.use((_request, response) => {
    response.status(404).json({ code: 404, message: 'API endpoint not found', data: null });
  });

  v1Router.use((error: Error, request: Request, response: Response, _next: NextFunction) => {
    options.onError?.(error, request);
    const compatibleError = error as Error & { status?: unknown; code?: unknown };
    const hasHttpStatus = typeof compatibleError.status === 'number';
    const wowError = error instanceof WowError
      ? error
      : hasHttpStatus
        ? new WowError(
            error.message,
            compatibleError.status as number,
            typeof compatibleError.code === 'number' ? compatibleError.code : compatibleError.status as number
          )
        : new WowError('Internal server error', 500);
    const message = wowError.message;
    response.status(wowError.status).json({ code: wowError.code, message, data: null });
  });

  router.use(V1_PREFIX, v1Router);

  return router;
}
