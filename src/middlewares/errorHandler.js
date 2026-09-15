export function errorHandler(err,re,res,next){
    console.error(err);
if (res.headersSent){
    return next(err);
    
}
res.status(500).json({
    success:false,
    error:{
        code:'INTERNAL_SERVER_ERROR',
        message:'Terjadi kesalahan pada server',
    } ,
});
}