const { Router } = require('express');
const { check } = require('express-validator');
const { productoPOST, productosGET, productoGET, productoPUT, productoDELETE, marcarProductoDestacado, obtenerProductosDestacados, buscarProductosPorNombre } = require('../controllers/producto');
const { validarJWT, esAdminRol } = require('../middlewares/auth.js');
const { validarCampos } = require('../middlewares/validarCampos');
const { existeProductoPorId } = require('../helpers/db-validators.js');

const router = Router();

// Crear un producto (Protegido y solo admin)
router.post('/', [
    validarJWT,
    esAdminRol,
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    check('categoria', 'La categoría es obligatoria').not().isEmpty(),
    check('precio', 'El precio debe ser un número').isNumeric(),
    validarCampos
], productoPOST);

// Obtener todos los productos con paginación
router.get('/', productosGET);

// Ruta para obtener los productos destacados
router.get('/destacados', obtenerProductosDestacados);

router.get(
    '/buscar',
    [validarJWT,
    esAdminRol],
    buscarProductosPorNombre
);

// Obtener un producto por ID
router.get('/:id', [
    check('id', 'El ID no es válido').isMongoId(),
    check('id').custom(existeProductoPorId),
    validarCampos
], productoGET);

// Actualizar un producto (Protegido y solo admin)
router.put('/:id', [
    validarJWT,
    esAdminRol,
    check('id', 'El ID no es válido').isMongoId(),
    check('nombre', 'El nombre es obligatorio').not().isEmpty(),
    check('id').custom(existeProductoPorId),
    validarCampos
], productoPUT);

// Eliminar un producto (Soft Delete, solo admin)
router.delete('/:id', [
    validarJWT,
    esAdminRol,
    check('id', 'El ID no es válido').isMongoId(),
    check('id').custom(existeProductoPorId),
    validarCampos
], productoDELETE);

// Ruta para marcar o desmarcar un producto como destacado (solo administradores)
router.put('/:id/destacar', [validarJWT, esAdminRol], marcarProductoDestacado);



module.exports = router;
