import { Router } from 'express';
import { uploadSingleImage } from '../../middlewares/upload.js';
import { validate } from '../../middlewares/validate.js';
import { idParamSchema } from '../../utils/commonSchemas.js';
import * as mediaController from './media.controller.js';
import { listMediaQuerySchema, uploadMediaSchema } from './media.schema.js';

const router = Router();

router.get('/', validate({ query: listMediaQuerySchema }), mediaController.list);
router.post('/', uploadSingleImage, validate({ body: uploadMediaSchema }), mediaController.upload);
router.delete('/:id', validate({ params: idParamSchema }), mediaController.remove);

export default router;
