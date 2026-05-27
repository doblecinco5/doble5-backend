const { Schema, model } = require('mongoose');

const DetalleMovimientoSchema = new Schema({

    talle: {
        type: String,
        required: true
    },

    cantidad: {
        type: Number,
        required: true
    }

}, { _id: false });

const MovimientoInventarioSchema = new Schema({

    tipo: {
        type: String,
        enum: [
            'ingreso',
            'venta_online',
            'venta_presencial',
            'ajuste'
        ],
        required: true
    },

    producto: {
        type: Schema.Types.ObjectId,
        ref: 'Producto',
        required: true
    },

    nombreProducto: {
        type: String,
        required: true
    },

    detalles: [DetalleMovimientoSchema],

    referenciaId: {
        type: Schema.Types.ObjectId,
        required: true
    },

    modeloReferencia: {
        type: String,
        enum: [
            'Ingreso',
            'Orden',
            'VentaPresencial',
            'Producto'
        ],
        required: true
    },

    observaciones: {
        type: String,
        default: ''
    },

    creadoPor: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario',
        default: null
    }

}, {
    timestamps: true
});

module.exports = model(
    'MovimientoInventario',
    MovimientoInventarioSchema
);