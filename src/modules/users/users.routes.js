import { Router } from 'express';
import { requireRole } from '../../middlewares/auth.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema } from '../../utils/commonSchemas.js';
import * as usersController from './users.controller.js';
import { createUserSchema, listUsersQuerySchema, updateUserSchema } from './users.schema.js';

const router = Router();

router.use(requireRole('SUPER_ADMIN'));

router.get('/', validate({ query: listUsersQuerySchema }), usersController.list);
router.get('/:id', validate({ params: idParamSchema }), usersController.getById);
router.post('/', validate({ body: createUserSchema }), usersController.create);
router.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateUserSchema }),
  usersController.update,
);
router.delete('/:id', validate({ params: idParamSchema }), usersController.remove);

export default router;
