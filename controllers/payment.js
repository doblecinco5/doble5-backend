const client = require('../config/mercadoPago');

const Orden = require('../models/orden');
const Carrito = require('../models/carrito');
const Producto = require('../models/producto');

const { Preference, Payment } = require('mercadopago');

const preference = new Preference(client);
const payment = new Payment(client);


exports.crearPreferencia = async (req, res) => {
    try {

        console.log('Entrando a crearPreferencia');
        console.log('Usuario:', req.usuario);

        if (!req.usuario) {
            return res.status(401).json({
                error: 'No autorizado'
            });
        }

        const idUsuario = req.usuario._id;
        const emailComprador = req.usuario.correo;
        const nombreComprador = req.usuario.nombre;

        const carrito = await Carrito
            .findOne({ usuario: idUsuario })
            .populate('productos.producto');

        if (!carrito || carrito.productos.length === 0) {
            return res.status(400).json({
                error: 'El carrito está vacío.'
            });
        }

        console.log(
            'Productos en carrito:',
            JSON.stringify(carrito.productos, null, 2)
        );

        const items = carrito.productos.map(item => ({
            title: item.producto.nombre,
            quantity: item.cantidad,
            unit_price: Number(item.producto.precio)
        }));



        const orden = await Orden.create({
            usuario: idUsuario,

            productos: carrito.productos.map(item => ({
                titulo: item.producto.nombre,
                cantidad: item.cantidad,
                precio_unitario: item.producto.precio,
                talle: item.talle
            })),

            comprador: {
                email: emailComprador
            },

            estado_pago: 'pending'
        });

        console.log(
            'Orden creada:',
            orden._id.toString()
        );


        //Crear preferencia
        const preferencia = await preference.create({
            body: {

                items,

                external_reference: orden._id.toString(),

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
                    success: `${process.env.FRONTEND_URL}/success`,
                    failure: `${process.env.FRONTEND_URL}/failure`,
                    pending: `${process.env.FRONTEND_URL}/pending`
                },

                notification_url: process.env.NOTIFICATION_URL,

                auto_return: 'approved'
            }
        });

        console.log(
            'Preferencia creada:',
            preferencia.id
        );

        //Guardar id de la preferencia

        orden.id_preferencia = preferencia.id;

        await orden.save();

        return res.status(200).json({
            id: preferencia.id
        });

    } catch (error) {

        console.error(
            'Error al crear preferencia:',
            error
        );

        return res.status(500).json({
            error: 'Error al procesar el pago'
        });
    }
};



//Webhook
exports.procesarWebhook = async (req, res) => {
    try {

        const tipo = req.body?.type;
        const idPago = req.body?.data?.id;

        // Ignorar eventos que no sean pagos
        if (tipo !== 'payment' || !idPago) {
            return res.sendStatus(200);
        }

        const pago = await payment.get({
            id: String(idPago)
        });

        if (!pago) {
            console.warn(`Pago ${idPago} no encontrado`);
            return res.sendStatus(200);
        }

        const externalReference = pago.external_reference;

        if (!externalReference) {
            console.warn(
                `Pago ${idPago} recibido sin external_reference`
            );

            return res.sendStatus(200);
        }

        const orden = await Orden.findById(externalReference);

        if (!orden) {
            console.warn(
                `Orden ${externalReference} no encontrada`
            );

            return res.sendStatus(200);
        }

        // Idempotencia:
        // Mercado Pago puede reenviar el webhook varias veces.
        if (orden.estado_pago === 'approved') {
            return res.sendStatus(200);
        }

        orden.id_pago = pago.id;
        orden.estado_pago = pago.status;
        orden.detalle_estado = pago.status_detail;
        orden.fecha_aprobado = pago.date_approved;

        await orden.save();

        // Sólo ejecutar lógica de negocio cuando el pago fue aprobado
        if (pago.status !== 'approved') {
            return res.sendStatus(200);
        }

        // Vaciar carrito
        await Carrito.findOneAndUpdate(
            { usuario: orden.usuario },
            { productos: [] }
        );

        // Descontar stock
        for (const item of orden.productos) {

            await Producto.findOneAndUpdate(
                {
                    nombre: item.titulo,
                    'talles.talle': item.talle
                },
                {
                    $inc: {
                        'talles.$.stock': -item.cantidad
                    }
                }
            );
        }

        return res.sendStatus(200);

    } catch (error) {

        console.error(
            'Error procesando webhook Mercado Pago:',
            error
        );

        return res.sendStatus(500);
    }
};