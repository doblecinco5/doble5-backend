const { Schema, model } = require('mongoose');

const MovimientoInventarioSchema = new Schema(
    {
        producto: {
            type: Schema.Types.ObjectId,
            ref: 'Producto',
            required: true
        },

        nombreProducto: {
            type: String,
            required: true
        },

        productos: [
            {
                producto,
                nombreProducto,
                cantidadCurvas,
                movimientoPorTalle
            }
        ],

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

        referenciaId: {
            type: Schema.Types.ObjectId,
            default: null
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
    },
    {
        timestamps: true
    }
);

MovimientoInventarioSchema.index({
    producto: 1
});

MovimientoInventarioSchema.index({
    tipo: 1
});

MovimientoInventarioSchema.index({
    createdAt: -1
});

module.exports = model(
    'MovimientoInventario',
    MovimientoInventarioSchema
);