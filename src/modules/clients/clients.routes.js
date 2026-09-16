import { createSortableRouter } from '../../lib/crud.js';
import { clientsController } from './clients.controller.js';
import { createClientSchema, updateClientSchema } from './clients.schema.js';

export default createSortableRouter(clientsController, {
  createSchema: createClientSchema,
  updateSchema: updateClientSchema,
});
