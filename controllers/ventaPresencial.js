const mongoose = require('mongoose');
const Producto = require('../models/producto');
const VentaPresencial = require('../models/ventaPresencial');
const MovimientoInventario = require('../models/movimientoInventario');

const crearVentaPresencial = async (req, res) => {

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        const {
            productos,
            metodoPago,
            observaciones
        } = req.body;

        if (!productos || productos.length === 0) {

            await session.abortTransaction();

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

            const producto = await Producto.findById(
                productoId
            ).session(session);

            if (!producto) {

                await session.abortTransaction();

                return res.status(404).json({
                    msg: 'Producto no encontrado'
                });
            }

            const talleProducto =
                producto.talles.find(
                    t => t.talle === talle
                );

            if (!talleProducto) {

                await session.abortTransaction();

                return res.status(400).json({
                    msg: `No existe talle ${talle} para ${producto.nombre}`
                });
            }

            if (talleProducto.stock < cantidad) {

                await session.abortTransaction();

                return res.status(400).json({
                    msg: `Stock insuficiente para ${producto.nombre} talle ${talle}`
                });
            }

            // Descontar stock
            talleProducto.stock -= cantidad;

            await producto.save({ session });

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
        const ventasCreadas =
            await VentaPresencial.create(
                [{
                    productos: productosVenta,
                    total,
                    metodoPago,
                    observaciones,
                    creadoPor: req.usuario._id
                }],
                { session }
            );

        const venta = ventasCreadas[0];

        // Crear movimientos individuales
        for (const item of productosVenta) {

            await MovimientoInventario.create(
                [{
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
                }],
                { session }
            );
        }

        await session.commitTransaction();

        return res.status(201).json({
            venta
        });

    } catch (error) {

        await session.abortTransaction();

        console.error(error);

        return res.status(500).json({
            msg: 'Error al registrar venta'
        });

    } finally {

        session.endSession();
    }
};

module.exports = {
    crearVentaPresencial
};