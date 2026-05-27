const Producto = require('../models/producto');
const Ingreso = require('../models/ingreso');
const MovimientoInventario = require('../models/movimientoInventario');

const TALLES_CURVA = [
    'S',
    'M',
    'L',
    'XL',
    'XXL'
];

const crearIngreso = async (req, res) => {

    try {

        const {
            proveedor,
            productos,
            observaciones
        } = req.body;

        if (!productos || productos.length === 0) {
            return res.status(400).json({
                msg: 'Debe enviar productos'
            });
        }

        const productosIngreso = [];
        let totalIngreso = 0;

        for (const item of productos) {

            const {
                nombre,
                descripcion,
                categoria,
                precioVenta,
                imagenes = [],
                cantidadCurvas,
                precioCurva,
                calidadTela
            } = item;

            let producto = await Producto.findOne({
                nombre
            });

            const subtotal =
                cantidadCurvas * precioCurva;

            totalIngreso += subtotal;

            // Crear producto si no existe
            if (!producto) {

                if (
                    !descripcion ||
                    !categoria ||
                    !precioVenta
                ) {
                    return res.status(400).json({
                        msg: `Faltan datos para crear el producto ${nombre}`
                    });
                }

                producto = await Producto.create({
                    nombre,
                    descripcion,
                    categoria,
                    precio: precioVenta,
                    imagenes,
                    activo: true,
                    destacado: false,

                    talles: TALLES_CURVA.map(
                        talle => ({
                            talle,
                            stock: cantidadCurvas
                        })
                    )
                });

            } else {

                // Aumentar stock
                for (const talleNombre of TALLES_CURVA) {

                    const talleExistente =
                        producto.talles.find(
                            t => t.talle === talleNombre
                        );

                    if (talleExistente) {

                        talleExistente.stock +=
                            cantidadCurvas;

                    } else {

                        producto.talles.push({
                            talle: talleNombre,
                            stock: cantidadCurvas
                        });
                    }
                }

                await producto.save();
            }

            productosIngreso.push({
                producto: producto._id,
                nombreProducto: producto.nombre,
                cantidadCurvas,
                precioCurva,
                subtotal,
                calidadTela
            });
        }

        // Crear ingreso
        const ingreso = await Ingreso.create({
            proveedor,
            productos: productosIngreso,
            total: totalIngreso,
            observaciones,
            creadoPor: req.usuario._id
        });

        // Crear movimientos
        for (const item of productosIngreso) {

            await MovimientoInventario.create({

                tipo: 'ingreso',

                producto: item.producto,

                nombreProducto:
                    item.nombreProducto,

                detalles: TALLES_CURVA.map(
                    talle => ({
                        talle,
                        cantidad:
                            item.cantidadCurvas
                    })
                ),

                referenciaId: ingreso._id,

                modeloReferencia: 'Ingreso',

                observaciones,

                creadoPor: req.usuario._id
            });
        }

        return res.status(201).json({
            ingreso
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            msg: 'Error al registrar ingreso'
        });
    }
};

module.exports = {
    crearIngreso
};