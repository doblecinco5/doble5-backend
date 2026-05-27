const { Schema, model } = require('mongoose');

const ProductoIngresoSchema = new Schema({
    
    producto: {
        type: Schema.Types.ObjectId,
        ref: 'Producto',
        required: true
    },

    nombreProducto: {
        type: String,
        required: true
    },

    cantidadCurvas: {
        type: Number,
        required: true,
        min: 1
    },

    precioCurva: {
        type: Number,
        required: true,
        min: 0
    },

    subtotal: {
        type: Number,
        required: true,
        min: 0
    },

    calidadTela: {
        type: String,
        default: ''
    }

}, { _id: false });

const IngresoSchema = new Schema({

    proveedor: {
        type: String,
        required: true
    },

    productos: [ProductoIngresoSchema],

    total: {
        type: Number,
        required: true,
        min: 0
    },

    observaciones: {
        type: String,
        default: ''
    },

    creadoPor: {
        type: Schema.Types.ObjectId,
        ref: 'Usuario'
    }

}, {
    timestamps: true
});

module.exports = model('Ingreso', IngresoSchema);