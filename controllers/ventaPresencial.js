const Producto = require('../models/producto');
const VentaPresencial = require('../models/ventaPresencial');
const MovimientoInventario = require('../models/movimientoInventario');

const crearVentaPresencial = async (req, res) => {

    try {

        const {
            productos,
            metodoPago,
            observaciones
        } = req.body;

        if (!productos || productos.length === 0) {

            return res.status(400).json({
                msg: 'Debe enviar productos'
            });
        }

        let total = 0;

        const productosVenta = [];

        // Procesar cada producto vendido
        for (const item of productos) {

            const {
                productoId,
                talle,
                cantidad
            } = item;

            const producto =
                await Producto.findById(productoId);

            if (!producto) {

                return res.status(404).json({
                    msg: 'Producto no encontrado'
                });
            }

            const talleProducto =
                producto.talles.find(
                    t => t.talle === talle
                );

            if (!talleProducto) {

                return res.status(400).json({
                    msg: `No existe talle ${talle} para ${producto.nombre}`
                });
            }

            if (talleProducto.stock < cantidad) {

                return res.status(400).json({
                    msg: `Stock insuficiente para ${producto.nombre} talle ${talle}`
                });
            }

            // Descontar stock
            talleProducto.stock -= cantidad;

            await producto.save();

            const subtotal =
                producto.precio * cantidad;

            total += subtotal;

            productosVenta.push({
                producto: producto._id,
                nombreProducto: producto.nombre,
                talle,
                cantidad,
                precioUnitario: producto.precio
            });
        }

        // Crear venta
        const venta =
            await VentaPresencial.create({
                productos: productosVenta,
                total,
                metodoPago,
                observaciones,
                creadoPor: req.usuario._id
            });

        // Crear movimientos individuales
        for (const item of productosVenta) {

            await MovimientoInventario.create({

                tipo: 'venta_presencial',

                producto: item.producto,

                nombreProducto: item.nombreProducto,

                detalles: [
                    {
                        talle: item.talle,
                        cantidad: -item.cantidad
                    }
                ],

                referenciaId: venta._id,

                modeloReferencia: 'VentaPresencial',

                observaciones,

                creadoPor: req.usuario._id
            });
        }

        return res.status(201).json({
            venta
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            msg: 'Error al registrar venta'
        });
    }
};

module.exports = {
    crearVentaPresencial
};