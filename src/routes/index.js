import {Router } from 'express';
import { success } from 'zod';
import { tr } from 'zod/locales';

const router = Router();

router.get ('/health',(req,res)=>{
    res.json({
        success:true,
        data:{
            status:'OK',
            timestamp: new Date().toISOString(),
        },
    });
});

export default router;