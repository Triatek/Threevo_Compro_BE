/**
 * Building blocks for simple "sortable content" resources (banners, clients,
 * testimonials): admin CRUD + reorder, audit log and cache invalidation.
 * Modules with more rules (services, articles, ...) write their own service.
 */
import { Router } from 'express';
import { z } from '../config/zod.js';
import { validate } from '../middlewares/validate.js';
import { NotFoundError } from '../utils/AppError.js';
import { booleanQuerySchema, idParamSchema, reorderSchema } from '../utils/commonSchemas.js';
import { sendCreated, sendSuccess } from '../utils/response.js';
import { AuditAction, actorFromRequest, writeAuditLog } from './audit.js';
import * as cache from './cache.js';
import { prisma } from './prisma.js';

export const listSortableQuerySchema = z.object({
  isActive: booleanQuerySchema.optional(),
});

export const sortOrderBy = [{ sortOrder: 'asc' }, { id: 'asc' }];

/** Update many `sortOrder` values atomically. Unknown id -> Prisma P2025 -> 404. */
export function reorderItems(model, items) {
  return prisma.$transaction(
    items.map(({ id, sortOrder }) => prisma[model].update({ where: { id }, data: { sortOrder } })),
  );
}

/**
 * @param {object} options
 * @param {string} options.model Prisma delegate name, e.g. "banner"
 * @param {string} options.entity Audit log entity, e.g. "Banner"
 * @param {string} options.label Indonesian label for messages, e.g. "Banner"
 * @param {object} options.publicSelect fields returned by public endpoints
 * @param {string[]} options.cacheKeys cache prefixes to invalidate on change
 */
export function createSortableService({ model, entity, label, publicSelect, cacheKeys }) {
  const delegate = () => prisma[model];
  const invalidate = () => cache.invalidate(...cacheKeys);

  async function getById(id) {
    const item = await delegate().findUnique({ where: { id } });
    if (!item) throw new NotFoundError(`${label} tidak ditemukan`);
    return item;
  }

  return {
    getById,

    listAdmin({ isActive } = {}) {
      return delegate().findMany({
        where: isActive === undefined ? {} : { isActive },
        orderBy: sortOrderBy,
      });
    },

    listActive() {
      return delegate().findMany({
        where: { isActive: true },
        select: publicSelect,
        orderBy: sortOrderBy,
      });
    },

    async create(actor, data) {
      const item = await delegate().create({ data });
      await writeAuditLog(actor, { action: AuditAction.CREATE, entity, entityId: item.id });
      invalidate();
      return item;
    },

    async update(actor, id, data) {
      await getById(id);
      const item = await delegate().update({ where: { id }, data });
      await writeAuditLog(actor, {
        action: AuditAction.UPDATE,
        entity,
        entityId: id,
        metadata: { fields: Object.keys(data) },
      });
      invalidate();
      return item;
    },

    async remove(actor, id) {
      await getById(id);
      await delegate().delete({ where: { id } });
      await writeAuditLog(actor, { action: AuditAction.DELETE, entity, entityId: id });
      invalidate();
    },

    async reorder(actor, items) {
      await reorderItems(model, items);
      await writeAuditLog(actor, {
        action: AuditAction.REORDER,
        entity,
        metadata: { items },
      });
      invalidate();
    },
  };
}

export function createSortableController(service, { label }) {
  return {
    async list(req, res) {
      sendSuccess(res, await service.listAdmin(req.validated.query));
    },
    async getById(req, res) {
      sendSuccess(res, await service.getById(req.validated.params.id));
    },
    async create(req, res) {
      const item = await service.create(actorFromRequest(req), req.validated.body);
      sendCreated(res, item, { message: `${label} berhasil dibuat` });
    },
    async update(req, res) {
      const item = await service.update(
        actorFromRequest(req),
        req.validated.params.id,
        req.validated.body,
      );
      sendSuccess(res, item, { message: `${label} berhasil diperbarui` });
    },
    async remove(req, res) {
      await service.remove(actorFromRequest(req), req.validated.params.id);
      sendSuccess(res, null, { message: `${label} berhasil dihapus` });
    },
    async reorder(req, res) {
      await service.reorder(actorFromRequest(req), req.validated.body);
      sendSuccess(res, null, { message: 'Urutan berhasil diperbarui' });
    },
  };
}

/** Admin router: GET /, PATCH /reorder, GET /:id, POST /, PATCH /:id, DELETE /:id */
export function createSortableRouter(controller, { createSchema, updateSchema }) {
  const router = Router();
  router.get('/', validate({ query: listSortableQuerySchema }), controller.list);
  // Must be registered before "/:id".
  router.patch('/reorder', validate({ body: reorderSchema }), controller.reorder);
  router.get('/:id', validate({ params: idParamSchema }), controller.getById);
  router.post('/', validate({ body: createSchema }), controller.create);
  router.patch('/:id', validate({ params: idParamSchema, body: updateSchema }), controller.update);
  router.delete('/:id', validate({ params: idParamSchema }), controller.remove);
  return router;
}
