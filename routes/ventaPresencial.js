const { Router } = require('express');
const { validarJWT } = require('../middlewares/validarJWT');
const { esAdminRol } = require('../middlewares/auth');

const {
    crearVentaPresencial
} = require('../controllers/ventaPresencial');

const router = Router();

router.post(
    '/',
   [
        validarJWT,
        esAdminRol
        
    ],
    crearVentaPresencial
);

module.exports = router;