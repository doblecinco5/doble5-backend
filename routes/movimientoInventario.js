const { Router } = require('express');
const { validarJWT } = require('../middlewares/validarJWT');
const { esAdminRol } = require('../middlewares/auth');

const {
    crearAjusteInventario
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

module.exports = router;