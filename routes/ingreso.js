const { Router } = require('express');
const { validarJWT } = require('../middlewares/validarJWT');
const { esAdminRol } = require('../middlewares/auth');

const {
    crearIngreso,
    obtenerIngresos,
    obtenerIngreso,
} = require('../controllers/ingreso');

const router = Router();

router.post(
    '/',
    [
        validarJWT,
        esAdminRol
    ],
    crearIngreso
);

router.get(
    '/',
    validarJWT,
    esAdminRol,
    obtenerIngresos
);

router.get(
    '/:id',
    validarJWT,
    esAdminRol,
    obtenerIngreso
);

module.exports = router;