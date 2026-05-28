const mongoose = require('mongoose');
const { request, response } = require('express');
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

const obtenerVentasPresenciales = async (req = request, res = response) => {

    try {

        const {
            limite = 10,
            desde = 0,
            metodoPago,
            fechaDesde,
            fechaHasta,
            query = ''
        } = req.query;

        const filtros = {};

        // Filtro por método de pago
        if (metodoPago) {
            filtros.metodoPago = metodoPago;
        }

        // Filtro por fechas
        if (fechaDesde || fechaHasta) {

            filtros.createdAt = {};

            if (fechaDesde) {
                filtros.createdAt.$gte = new Date(fechaDesde);
            }

            if (fechaHasta) {

                const fechaFinal = new Date(fechaHasta);
                fechaFinal.setHours(23, 59, 59, 999);

                filtros.createdAt.$lte = fechaFinal;
            }
        }

        // Búsqueda por nombre de producto
        if (query) {

            filtros['productos.nombreProducto'] = {
                $regex: query,
                $options: 'i'
            };
        }

        const [total, ventas] = await Promise.all([

            VentaPresencial.countDocuments(filtros),

            VentaPresencial
                .find(filtros)
                .populate('creadoPor', 'nombre correo')
                .populate(
                    'productos.producto',
                    'nombre categoria precio imagenes'
                )
                .sort({ createdAt: -1 })
                .skip(Number(desde))
                .limit(Number(limite))
        ]);

        return res.json({
            total,
            ventas
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            msg: 'Error al obtener ventas presenciales'
        });
    }
};

const obtenerVentaPresencial = async (req = request, res = response) => {

    try {

        const { id } = req.params;

        const venta = await VentaPresencial
            .findById(id)
            .populate('creadoPor', 'nombre correo')
            .populate(
                'productos.producto',
                'nombre categoria precio imagenes'
            );

        if (!venta) {

            return res.status(404).json({
                msg: 'Venta no encontrada'
            });
        }

        return res.json({
            venta
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            msg: 'Error al obtener venta'
        });
    }
};


module.exports = {
    crearVentaPresencial,
    obtenerVentasPresenciales,
    obtenerVentaPresencial,
};