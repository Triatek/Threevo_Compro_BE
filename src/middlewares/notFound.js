import { success } from "zod";

export function notFound(req,res){
    res.status(404).json({
        success:false,
        error:{
            code:'NOT_FOUND',
            message:`Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`,
        }
    })
}