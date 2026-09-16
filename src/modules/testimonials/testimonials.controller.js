import { createSortableController } from '../../lib/crud.js';
import { testimonialsService } from './testimonials.service.js';

export const testimonialsController = createSortableController(testimonialsService, {
  label: 'Testimoni',
});
