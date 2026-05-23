const { Schema, model } = require('mongoose');

const ReservaStockSchema = new Schema(
    {
        usuario: {
            type: Schema.Types.ObjectId,
            ref: 'Usuario',
            required: true
        },

        orden: {
            type: Schema.Types.ObjectId,
            ref: 'Orden',
            required: true
        },

        estado: {
            type: String,
            enum: ['activa', 'confirmada', 'expirada'],
            default: 'activa'
        },

        productos: [
            {
                producto: {
                    type: Schema.Types.ObjectId,
                    ref: 'Producto',
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
                }
            }
        ],

        expiraEn: {
            type: Date,
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = model(
    'ReservaStock',
    ReservaStockSchema
);