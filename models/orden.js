// models/Orden.js
const mongoose = require('mongoose');

const ordenSchema = new mongoose.Schema({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    productos: [
        {
            titulo: String,
            cantidad: Number,
            precio_unitario: Number,
            talle: String 
        }
    ],

    comprador: {
        email: String
    },
    id_pago: String,
    estado_pago: String,
    id_preferencia: String,
    detalle_estado: String,
    fecha_aprobado: Date,
    creadoEn: {
        type: Date,
        default: Date.now
    },
    idReserva: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ReservaStock'
    },
});

module.exports = mongoose.model('Orden', ordenSchema);
