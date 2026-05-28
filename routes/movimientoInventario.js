const { Router } = require('express');
const { validarJWT } = require('../middlewares/validarJWT');
const { esAdminRol } = require('../middlewares/auth');

const {
    crearAjusteInventario,
    obtenerMovimientoInventario,
    obtenerMovimientosInventario
} = require('../controllers/movimientoInventario');

const router = Router();

router.post(
    '/',
    [
        validarJWT,
        esAdminRol
        
    ],
    crearAjusteInventario
);

router.get(
    '/',
    validarJWT,
    esAdminRol,
    obtenerMovimientosInventario
);

router.get(
    '/:id',
    validarJWT,
    esAdminRol,
    obtenerMovimientoInventario
)

module.exports = router;