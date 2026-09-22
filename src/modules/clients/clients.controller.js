import { createSortableController } from '../../lib/crud.js';
import { clientsService } from './clients.service.js';

export const clientsController = createSortableController(clientsService, { label: 'Klien' });
