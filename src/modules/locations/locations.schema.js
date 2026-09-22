import { z } from '../../config/zod.js';
import {
  booleanQuerySchema,
  httpUrlSchema,
  partialUpdate,
  sortOrderSchema,
} from '../../utils/commonSchemas.js';
import { paginationSchema } from '../../utils/pagination.js';

export const locationTypeSchema = z.enum(['WAREHOUSE', 'OFFICE', 'HUB']);

const locationFields = z.object({
  name: z.string().trim().min(2).max(150),
  type: locationTypeSchema,
  address: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().max(100).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  phone: z.string().trim().max(30).nullable(),
  mapsUrl: httpUrlSchema.nullable(),
  sortOrder: sortOrderSchema,
  isActive: z.boolean(),
});

const coordinatesTogether = (value) =>
  (value.latitude == null) === (value.longitude == null);
const coordinatesMessage = {
  message: 'Latitude dan longitude harus diisi bersamaan',
  path: ['longitude'],
};

export const createLocationSchema = locationFields
  .partial()
  .extend({
    name: locationFields.shape.name,
    address: locationFields.shape.address,
    city: locationFields.shape.city,
    type: locationTypeSchema.default('WAREHOUSE'),
    sortOrder: sortOrderSchema.default(0),
    isActive: z.boolean().default(true),
  })
  .refine(coordinatesTogether, coordinatesMessage);

// Coordinates pairing on update is checked in the service (needs existing values).
export const updateLocationSchema = partialUpdate(locationFields);

export const publicLocationsQuerySchema = z.object({
  city: z.string().trim().min(1).max(100).optional(),
  type: z
    .string()
    .trim()
    .toUpperCase()
    .pipe(locationTypeSchema)
    .optional(),
});

export const listLocationsQuerySchema = paginationSchema.extend(publicLocationsQuerySchema.shape).extend({
  q: z.string().trim().max(100).optional(),
  isActive: booleanQuerySchema.optional(),
});
