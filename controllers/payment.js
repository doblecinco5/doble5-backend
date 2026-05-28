const mongoose = require('mongoose');

const client = require('../config/mercadoPago');

const Orden = require('../models/orden');
const Carrito = require('../models/carrito');
const Producto = require('../models/producto');
const ReservaStock = require('../models/reservaStock');
const MovimientoInventario = require('../models/movimientoInventario');

const { Preference, Payment } = require('mercadopago');

const preference = new Preference(client);
const payment = new Payment(client);

exports.crearPreferencia = async (req, res) => {

    const session = await mongoose.startSession();

    try {

        session.startTransaction();

        console.log('Entrando a crearPreferencia');

        if (!req.usuario) {

            await session.abortTransaction();

            return res.status(401).json({
                error: 'No autorizado'
            });
        }

        const idUsuario = req.usuario._id;
        const emailComprador = req.usuario.correo;
        const nombreComprador = req.usuario.nombre;

        const carrito = await Carrito
            .findOne({
                usuario: idUsuario
            })
            .populate('productos.producto')
            .session(session);

        if (!carrito || carrito.productos.length === 0) {

            await session.abortTransaction();

            return res.status(400).json({
                error: 'El carrito está vacío.'
            });
        }

        // Reservar stock
        for (const item of carrito.productos) {

            const productoActualizado =
                await Producto.findOneAndUpdate(
                    {
                        _id: item.producto._id,

                        talles: {
                            $elemMatch: {
                                talle: item.talle,
                                stock: {
                                    $gte: item.cantidad
                                }
                            }
                        }
                    },
                    {
                        $inc: {
                            'talles.$.stock':
                                -item.cantidad
                        }
                    },
                    {
                        new: true,
                        session
                    }
                );

            if (!productoActualizado) {

                await session.abortTransaction();

                return res.status(400).json({
                    error: `Stock insuficiente para ${item.producto.nombre} talle ${item.talle}`
                });
            }
        }

        const items = carrito.productos.map(
            item => ({
                title: item.producto.nombre,
                quantity: item.cantidad,
                unit_price: Number(
                    item.producto.precio
                )
            })
        );

        const ordenesCreadas =
            await Orden.create(
                [{
                    usuario: idUsuario,

                    productos:
                        carrito.productos.map(
                            item => ({
                                producto:
                                    item.producto._id,

                                titulo:
                                    item.producto.nombre,

                                cantidad:
                                    item.cantidad,

                                precio_unitario:
                                    item.producto.precio,

                                talle:
                                    item.talle
                            })
                        ),

                    comprador: {
                        email: emailComprador
                    },

                    estado_pago: 'pending'
                }],
                { session }
            );

        const orden = ordenesCreadas[0];

        console.log(
            'Orden creada:',
            orden._id.toString()
        );

        const fechaExpiracion = new Date(
            Date.now() + (10 * 60 * 1000)
        );

        // Crear reserva
        const reservasCreadas =
            await ReservaStock.create(
                [{
                    usuario: idUsuario,

                    orden: orden._id,

                    estado: 'activa',

                    productos:
                        carrito.productos.map(
                            item => ({
                                producto:
                                    item.producto._id,

                                talle:
                                    item.talle,

                                cantidad:
                                    item.cantidad
                            })
                        ),

                    expiraEn:
                        fechaExpiracion
                }],
                { session }
            );

        const reserva = reservasCreadas[0];

        orden.idReserva = reserva._id;

        await orden.save({ session });

        const preferencia =
            await preference.create({
                body: {

                    external_reference:
                        orden._id.toString(),

                    items,

                    expires: true,

                    expiration_date_from:
                        new Date().toISOString(),

                    expiration_date_to:
                        fechaExpiracion.toISOString(),

                    payer: {
                        name: nombreComprador,
                        email: emailComprador
                    },

                    payment_methods: {
                        excluded_payment_types: [
                            { id: 'ticket' },
                            { id: 'atm' }
                        ],
                        installments: 12
                    },

                    back_urls: {
                        success:
                            `${process.env.FRONTEND_URL}/success`,

                        failure:
                            `${process.env.FRONTEND_URL}/failure`,

                        pending:
                            `${process.env.FRONTEND_URL}/pending`
                    },

                    notification_url:
                        process.env.NOTIFICATION_URL,

                    auto_return: 'approved'
                }
            });

        console.log(
            'Preferencia creada:',
            preferencia.id
        );

        orden.id_preferencia =
            preferencia.id;

        await orden.save({ session });

        await session.commitTransaction();

        return res.status(200).json({
            id: preferencia.id
        });

    } catch (error) {

        await session.abortTransaction();

        console.error(
            'Error al crear preferencia:',
            error
        );

        return res.status(500).json({
            error: 'Error al procesar el pago'
        });

    } finally {

        session.endSession();
    }
};

// WEBHOOK
exports.procesarWebhook = async (
    req,
    res
) => {

    const session =
        await mongoose.startSession();

    try {

        session.startTransaction();

        const tipo = req.body?.type;

        const idPago =
            req.body?.data?.id;

        // Ignorar eventos no payment
        if (
            tipo !== 'payment' ||
            !idPago
        ) {

            await session.abortTransaction();

            return res.sendStatus(200);
        }

        const pago = await payment.get({
            id: String(idPago)
        });

        if (!pago) {

            console.warn(
                `Pago ${idPago} no encontrado`
            );

            await session.abortTransaction();

            return res.sendStatus(200);
        }

        const externalReference =
            pago.external_reference;

        if (!externalReference) {

            console.warn(
                `Pago ${idPago} sin external_reference`
            );

            await session.abortTransaction();

            return res.sendStatus(200);
        }

        const orden =
            await Orden.findById(
                externalReference
            ).session(session);

        if (!orden) {

            console.warn(
                `Orden ${externalReference} no encontrada`
            );

            await session.abortTransaction();

            return res.sendStatus(200);
        }

        // Idempotencia
        if (
            orden.estado_pago ===
            'approved'
        ) {

            await session.abortTransaction();

            return res.sendStatus(200);
        }

        orden.id_pago = pago.id;
        orden.estado_pago = pago.status;
        orden.detalle_estado =
            pago.status_detail;

        orden.fecha_aprobado =
            pago.date_approved;

        await orden.save({ session });

        // Si no está aprobado
        if (pago.status !== 'approved') {

            await session.commitTransaction();

            return res.sendStatus(200);
        }

        // Marcar reserva consumida
        if (orden.idReserva) {

            await ReservaStock.findByIdAndUpdate(
                orden.idReserva,
                {
                    estado: 'consumida'
                },
                { session }
            );
        }

        // Crear movimientos inventario
        for (const item of orden.productos) {

            await MovimientoInventario.create(
                [{
                    tipo: 'venta_online',

                    producto:
                        item.producto,

                    nombreProducto:
                        item.titulo,

                    detalles: [
                        {
                            talle: item.talle,

                            cantidad:
                                -item.cantidad
                        }
                    ],

                    referenciaId:
                        orden._id,

                    modeloReferencia:
                        'Orden',

                    observaciones:
                        'Venta online MercadoPago',

                    creadoPor: null
                }],
                { session }
            );
        }

        // Vaciar carrito
        await Carrito.findOneAndUpdate(
            {
                usuario:
                    orden.usuario
            },
            {
                productos: []
            },
            { session }
        );

        await session.commitTransaction();

        return res.sendStatus(200);

    } catch (error) {

        await session.abortTransaction();

        console.error(
            'Error procesando webhook Mercado Pago:',
            error
        );

        return res.sendStatus(500);

    } finally {

        session.endSession();
    }
};