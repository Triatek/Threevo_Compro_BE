import { createSortableRouter } from '../../lib/crud.js';
import { testimonialsController } from './testimonials.controller.js';
import { createTestimonialSchema, updateTestimonialSchema } from './testimonials.schema.js';

export default createSortableRouter(testimonialsController, {
  createSchema: createTestimonialSchema,
  updateSchema: updateTestimonialSchema,
});
