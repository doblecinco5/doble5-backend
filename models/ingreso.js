const { Schema, model } = require('mongoose');

const IngresoSchema = new Schema(
    {
        proveedor: {
            type: String,
            required: true
        },

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
            }
        ],

        totalIngreso: {
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
            ref: 'Usuario',
            required: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = model('Ingreso', IngresoSchema);