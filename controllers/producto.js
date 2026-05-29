const { request, response } = require('express');
const Producto = require('../models/producto');

// Marcar o desmarcar un producto como destacado
const marcarProductoDestacado = async (req, res) => {
    const { id } = req.params;
    const { destacado } = req.body;

    try {
        const producto = await Producto.findByIdAndUpdate(id, { destacado }, { new: true });

        if (!producto) {
            return res.status(404).json({ msg: 'Producto no encontrado' });
        }

        res.json({
            msg: destacado ? 'Producto marcado como destacado' : 'Producto desmarcado como destacado',
            producto
        });
    } catch (error) {
        console.error('Error al actualizar el producto:', error);
        res.status(500).json({ msg: 'Error al actualizar el producto' });
    }
};

// Obtener productos destacados
const obtenerProductosDestacados = async (req, res) => {
    try {
        const productosDestacados = await Producto.find({ destacado: true, activo: true });
        res.json({ productos: productosDestacados });
    } catch (error) {
        console.error('Error al obtener productos destacados:', error);
        res.status(500).json({ msg: 'Error al obtener productos destacados' });
    }
};

// Crear un nuevo producto
const productoPOST = async (req = request, res = response) => {

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        const {
            nombre,
            descripcion,
            categoria,
            precio,
            imagenes,
            talles
        } = req.body;

        if (
            !Array.isArray(talles) ||
            !talles.every(
                t =>
                    t.talle &&
                    typeof t.stock === 'number'
            )
        ) {

            await session.abortTransaction();

            return res.status(400).json({
                msg: 'Los talles deben tener estructura { talle, stock }'
            });
        }

        const productoExistente =
            await Producto.findOne({
                nombre
            }).session(session);

        if (productoExistente) {

            await session.abortTransaction();

            return res.status(400).json({
                msg: `El producto ${nombre} ya existe.`
            });
        }

        const tallesNormalizados =
            talles.map(t => ({
                talle: t.talle.toUpperCase(),
                stock: t.stock
            }));

        const productosCreados =
            await Producto.create(
                [{
                    nombre,
                    descripcion,
                    categoria,
                    precio,
                    imagenes,
                    talles: tallesNormalizados
                }],
                { session }
            );

        const producto = productosCreados[0];

        // Crear movimiento inventario
        await MovimientoInventario.create(
            [{
                tipo: 'creacion',

                producto: producto._id,

                nombreProducto: producto.nombre,

                detalles: tallesNormalizados.map(
                    item => ({
                        talle: item.talle,
                        cantidad: item.stock
                    })
                ),

                referenciaId: producto._id,

                modeloReferencia: 'Producto',

                observaciones: 'Creación manual de producto',

                creadoPor: req.usuario._id
            }],
            { session }
        );

        await session.commitTransaction();

        return res.status(201).json({
            msg: 'Producto creado correctamente',
            producto
        });

    } catch (error) {

        await session.abortTransaction();

        console.error(
            'Error al crear producto:',
            error
        );

        return res.status(500).json({
            msg: 'Error al crear el producto'
        });

    } finally {

        session.endSession();
    }
};



// Obtener productos con búsqueda opcional y paginación
const productosGET = async (req = request, res = response) => {
    const {
        query = '',
        limite = 8,
        desde = 0,
        categoria,  // string simple
        talle,      // string simple
        precioMin,
        precioMax,
        orden
    } = req.query;

    const searchQuery = { activo: true };

    // Búsqueda general (query de texto)
    if (query) {
        const regex = new RegExp(query, 'i');
        searchQuery.$or = [
            { nombre: regex },
            { categoria: regex }
        ];
    }

    // Filtro por categoría (solo un string)
    if (categoria) {
        searchQuery.categoria = categoria;
    }

    // Filtro por talle (solo un string)
    if (talle) {
        searchQuery['talles.talle'] = talle.toUpperCase();
    }

    // Filtro por precio
    if (precioMin || precioMax) {
        searchQuery.precio = {};
        if (precioMin) searchQuery.precio.$gte = Number(precioMin);
        if (precioMax) searchQuery.precio.$lte = Number(precioMax);
    }

    // Ordenamiento
    const sort = {};
    if (orden === 'asc') sort.precio = 1;
    else if (orden === 'desc') sort.precio = -1;

    try {
        const [total, productos] = await Promise.all([
            Producto.countDocuments(searchQuery),
            Producto.find(searchQuery)
                .sort(sort)
                .skip(Number(desde))
                .limit(Number(limite))
        ]);

        res.json({ total, productos });
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ msg: 'Error al obtener los productos' });
    }
};




// Obtener un producto por ID
const productoGET = async (req = request, res = response) => {
    const { id } = req.params;

    try {
        const producto = await Producto.findById(id);
        if (!producto || !producto.activo) {
            return res.status(404).json({ msg: 'Producto no encontrado o inactivo' });
        }

        res.json(producto);
    } catch (error) {
        console.error('Error al obtener el producto:', error);
        res.status(500).json({ msg: 'Error al obtener el producto' });
    }
};

// Actualizar un producto
// Actualizar un producto
const productoPUT = async (req = request, res = response) => {
    const { id } = req.params;
    const { ...data } = req.body;

    if (data.nombre) {
        data.nombre = data.nombre;
    }

    if (data.categoria) {
        data.categoria = data.categoria;
    }

    // Validación opcional de talles
    if (data.talles && (!Array.isArray(data.talles) || !data.talles.every(t => t.talle && typeof t.stock === 'number'))) {
        return res.status(400).json({ msg: 'Los talles deben tener estructura { talle, stock }' });
    }

    try {
        const productoActualizado = await Producto.findByIdAndUpdate(id, data, { new: true });
        if (!productoActualizado) {
            return res.status(404).json({ msg: 'Producto no encontrado' });
        }

        res.json({
            msg: 'Producto actualizado correctamente',
            productoActualizado
        });
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ msg: 'Error al actualizar el producto' });
    }
};


// Eliminar un producto (Soft Delete)
const productoDELETE = async (req = request, res = response) => {
    const { id } = req.params;

    try {
        const productoEliminado = await Producto.findByIdAndUpdate(id, { activo: false }, { new: true });
        if (!productoEliminado) {
            return res.status(404).json({ msg: 'Producto no encontrado' });
        }

        res.json({
            msg: 'Producto eliminado correctamente',
            productoEliminado
        });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ msg: 'Error al eliminar el producto' });
    }
};

module.exports = {
    marcarProductoDestacado,
    obtenerProductosDestacados,
    productoPOST,
    productosGET,
    productoGET,
    productoPUT,
    productoDELETE
};
