const { Router } = require('express');
const { validarJWT } = require('../middlewares/validarJWT');
const { esAdminRol } = require('../middlewares/auth');

const {
    crearIngreso
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

module.exports = router;