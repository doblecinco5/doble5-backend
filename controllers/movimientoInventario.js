const Producto = require('../models/producto');
const MovimientoInventario =
    require('../models/movimientoInventario');

const crearAjusteInventario = async (
    req,
    res
) => {

    try {

        const {
            productoId,
            detalles,
            observaciones
        } = req.body;

        const producto =
            await Producto.findById(
                productoId
            );

        if (!producto) {

            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }

        for (const item of detalles) {

            const talle =
                producto.talles.find(
                    t => t.talle === item.talle
                );

            // Si el talle no existe
            if (!talle) {

                // No permitir negativos
                if (item.cantidad < 0) {

                    return res.status(400).json({
                        msg: `No se puede crear talle ${item.talle} con stock negativo`
                    });
                }

                producto.talles.push({
                    talle: item.talle,
                    stock: item.cantidad
                });

                continue;
            }

            talle.stock += item.cantidad;

            // Evitar stock negativo
            if (talle.stock < 0) {

                return res.status(400).json({
                    msg: `Stock negativo para talle ${item.talle}`
                });
            }
        }

        await producto.save();

        const movimiento =
            await MovimientoInventario.create({

                tipo: 'ajuste',

                producto: producto._id,

                nombreProducto: producto.nombre,

                detalles,

                
                referenciaId: producto._id,

                modeloReferencia: 'Producto',

                observaciones,

                creadoPor: req.usuario._id
            });

        return res.status(201).json({
            movimiento
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            msg: 'Error al ajustar inventario'
        });
    }
};

module.exports = {
    crearAjusteInventario
};