const ReservaStock = require('../models/reservaStock');
const Producto = require('../models/producto');

const liberarReservasExpiradas = async () => {

    try {

        const reservasExpiradas =
            await ReservaStock.find({
                estado: 'activa',
                expiraEn: { $lte: new Date() }
            });

        for (const reserva of reservasExpiradas) {

            for (const item of reserva.productos) {

                await Producto.findOneAndUpdate(
                    {
                        _id: item.producto,
                        'talles.talle': item.talle
                    },
                    {
                        $inc: {
                            'talles.$.stock': item.cantidad
                        }
                    }
                );
            }

            reserva.estado = 'expirada';

            await reserva.save();
        }

    } catch (error) {

        console.error(
            'Error liberando reservas expiradas:',
            error
        );
    }
};

module.exports = {
    liberarReservasExpiradas
};