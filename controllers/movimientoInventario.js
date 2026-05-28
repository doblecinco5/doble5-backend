const mongoose = require('mongoose');
const { request, response } = require('express');
const Producto = require('../models/producto');
const MovimientoInventario = require('../models/movimientoInventario');

const crearAjusteInventario = async (
    req,
    res
) => {

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        const {
            productoId,
            detalles,
            observaciones
        } = req.body;

        const producto =
            await Producto.findById(
                productoId
            ).session(session);

        if (!producto) {

            await session.abortTransaction();

            return res.status(404).json({
                msg: 'Producto no encontrado'
            });
        }

        if (!detalles || detalles.length === 0) {

            await session.abortTransaction();

            return res.status(400).json({
                msg: 'Debe enviar detalles'
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

                    await session.abortTransaction();

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

                await session.abortTransaction();

                return res.status(400).json({
                    msg: `Stock negativo para talle ${item.talle}`
                });
            }
        }

        await producto.save({ session });

        const movimientosCreados =
            await MovimientoInventario.create(
                [{
                    tipo: 'ajuste',

                    producto: producto._id,

                    nombreProducto: producto.nombre,

                    detalles,

                    referenciaId: producto._id,

                    modeloReferencia: 'Producto',

                    observaciones,

                    creadoPor: req.usuario._id
                }],
                { session }
            );

        const movimiento =
            movimientosCreados[0];

        await session.commitTransaction();

        return res.status(201).json({
            movimiento
        });

    } catch (error) {

        await session.abortTransaction();

        console.error(error);

        return res.status(500).json({
            msg: 'Error al ajustar inventario'
        });

    } finally {

        session.endSession();
    }
};

const obtenerMovimientosInventario = async (
    req = request,
    res = response
) => {

    try {

        const {
            limite = 10,
            desde = 0,
            tipo,
            query = '',
            fechaDesde,
            fechaHasta
        } = req.query;

        const filtros = {};

        // Filtro por tipo
        if (tipo) {
            filtros.tipo = tipo;
        }

        // Buscar por nombre producto
        if (query) {

            filtros.nombreProducto = {
                $regex: query,
                $options: 'i'
            };
        }

        // Filtro fechas
        if (fechaDesde || fechaHasta) {

            filtros.createdAt = {};

            if (fechaDesde) {

                filtros.createdAt.$gte =
                    new Date(fechaDesde);
            }

            if (fechaHasta) {

                const fechaFinal =
                    new Date(fechaHasta);

                fechaFinal.setHours(
                    23,
                    59,
                    59,
                    999
                );

                filtros.createdAt.$lte =
                    fechaFinal;
            }
        }

        const [total, movimientos] =
            await Promise.all([

                MovimientoInventario.countDocuments(
                    filtros
                ),

                MovimientoInventario
                    .find(filtros)

                    .populate(
                        'producto',
                        'nombre categoria precio imagenes talles'
                    )

                    .populate(
                        'creadoPor',
                        'nombre correo'
                    )

                    .sort({
                        createdAt: -1
                    })

                    .skip(Number(desde))

                    .limit(Number(limite))
            ]);

        return res.json({
            total,
            movimientos
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            msg: 'Error al obtener movimientos'
        });
    }
};

const obtenerMovimientoInventario = async (
    req = request,
    res = response
) => {

    try {

        const { id } = req.params;

        const movimiento =
            await MovimientoInventario
                .findById(id)

                .populate(
                    'producto',
                    'nombre categoria precio imagenes talles'
                )

                .populate(
                    'creadoPor',
                    'nombre correo'
                );

        if (!movimiento) {

            return res.status(404).json({
                msg: 'Movimiento no encontrado'
            });
        }

        return res.json({
            movimiento
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            msg: 'Error al obtener movimiento'
        });
    }
};

module.exports = {
    crearAjusteInventario,
    obtenerMovimientosInventario,
    obtenerMovimientoInventario
};