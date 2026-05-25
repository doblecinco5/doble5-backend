const { Schema, model } = require('mongoose');

const IngresoSchema = new Schema(
    {
        proveedor: {
            type: String,
            required: true,
            trim: true
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

        detalles: [
            {
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

        precioCompraUnitario: {
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
    },
    {
        timestamps: true
    }
);

module.exports = model('Ingreso', IngresoSchema);