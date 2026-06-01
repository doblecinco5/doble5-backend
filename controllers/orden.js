const Orden = require('../models/orden');

const obtenerOrdenes = async (req, res) => {

    try {

        const {
            limite = 10,
            desde = 0,
            estado,
            fechaDesde,
            fechaHasta,
            query = ''
        } = req.query;

        const filtros = {};

        // Filtrar por estado
        if (estado) {
            filtros.estado_pago = estado;
        }

        // Filtrar por fechas
        if (fechaDesde || fechaHasta) {

            filtros.creadoEn = {};

            if (fechaDesde) {
                filtros.creadoEn.$gte =
                    new Date(fechaDesde);
            }

            if (fechaHasta) {

                const fechaFinal =
                    new Date(fechaHasta);

                fechaFinal.setHours(
                    23,
                    59,
                    59,
                    999
                );

                filtros.creadoEn.$lte =
                    fechaFinal;
            }
        }

        // Buscar por producto
        if (query) {

            filtros['productos.titulo'] = {
                $regex: query,
                $options: 'i'
            };
        }

        const [total, ordenes] =
            await Promise.all([

                Orden.countDocuments(filtros),

                Orden.find(filtros)
                    .populate(
                        'usuario',
                        'nombre correo'
                    )
                    .sort({
                        creadoEn: -1
                    })
                    .skip(Number(desde))
                    .limit(Number(limite))
            ]);

        return res.json({
            total,
            ordenes
        });

    } catch (error) {

        console.error(
            'Error al obtener órdenes:',
            error
        );

        return res.status(500).json({
            msg: 'Error al obtener las órdenes'
        });
    }
};

const obtenerOrdenPorId = async (
    req,
    res
) => {

    try {

        const { id } = req.params;

        const orden = await Orden.findById(id)
            .populate(
                'usuario',
                'nombre correo'
            );

        if (!orden) {

            return res.status(404).json({
                msg: 'Orden no encontrada'
            });
        }

        return res.json({
            orden
        });

    } catch (error) {

        console.error(
            'Error al buscar orden:',
            error
        );

        return res.status(500).json({
            msg: 'Error al buscar la orden'
        });
    }
};

module.exports = {
    obtenerOrdenes,
    obtenerOrdenPorId
};