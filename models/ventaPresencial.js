const { Schema, model } = require('mongoose');

const VentaPresencialSchema = new Schema(
    {
        productos: [
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

                talle: {
                    type: String,
                    required: true
                },

                cantidad: {
                    type: Number,
                    required: true,
                    min: 1
                },

                precioUnitario: {
                    type: Number,
                    required: true,
                    min: 0
                }
            }
        ],

        total: {
            type: Number,
            required: true,
            min: 0
        },

        metodoPago: {
            type: String,
            enum: [
                'efectivo',
                'transferencia',
                'debito',
                'credito',
                'mercadopago',
                'otro'
            ],
            default: 'efectivo'
        },

        observaciones: {
            type: String,
            default: ''
        },

        creadoPor: {
            type: Schema.Types.ObjectId,
            ref: 'Usuario',
            required: true
        }
    },
    {
        timestamps: true
    }
);

VentaPresencialSchema.index({
    createdAt: -1
});

module.exports = model(
    'VentaPresencial',
    VentaPresencialSchema
);