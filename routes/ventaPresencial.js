const { Router } = require('express');
const { validarJWT } = require('../middlewares/validarJWT');
const { esAdminRol } = require('../middlewares/auth');

const {
    crearVentaPresencial,
    obtenerVentasPresenciales,
    obtenerVentaPresencial,
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

router.get(
    '/',
    validarJWT,
    esAdminRol,
    obtenerVentasPresenciales,
);

router.get(
    '/:id',
    validarJWT,
    esAdminRol,
    obtenerVentaPresencial,
);

module.exports = router;