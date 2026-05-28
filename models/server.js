const express = require('express');
const cors = require('cors');
const { dbConection } = require('../database/config');
const { iniciarJobs } = require('../jobs');

class Server {
    constructor() {
        this.app = express();
        this.port = process.env.PORT;
        this.authPath = '/api/auth';
        this.usuariosPath = '/api/usuario';
        this.productosPath = '/api/producto';
        this.categoriaPath = '/api/categoria';
        this.carritoPath = '/api/carrito';
        this.paymentPath = '/api/payment';
        this.ordenPath = '/api/orden';
        this.ingresoPath = '/api/ingreso';
        this.ventaPresencialPath = '/api/venta-presencial';
        this.movimientoInventarioPath = '/api/movimiento-inventario';


        // Conectar con la DB
        this.conectarDB();

        // Middlewares
        this.middlewares();

        // Funciones de las rutas
        this.routes();
    }

    async conectarDB() {
        await dbConection();
        iniciarJobs();
    }

    middlewares() {

        this.app.use(cors({
            origin: ['http://localhost:3000', process.env.FRONTEND_URL, process.env.DASHBOARD_URL], // Lista de orígenes permitidos
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', "x-token"],
            credentials: true,
        }));


        this.app.use(express.json());


        this.app.use(express.static('public'));
    }

    routes() {
        this.app.use(this.authPath, require('../routes/auth'));
        this.app.use(this.usuariosPath, require('../routes/usuario'));
        this.app.use(this.productosPath, require('../routes/producto'));
        this.app.use(this.categoriaPath, require('../routes/categoria'));
        this.app.use(this.carritoPath, require('../routes/carrito'));
        this.app.use(this.paymentPath, require('../routes/payment'))
        this.app.use(this.ordenPath, require('../routes/orden'));
        this.app.use(this.ingresoPath, require('../routes/ingreso'));
        this.app.use(this.ventaPresencialPath, require('../routes/ventaPresencial'));
        this.app.use(this.movimientoInventarioPath, require('../routes/movimientoInventario'));
    }

    listen() {
        this.app.listen(this.port, () => {
            console.log('Server online port: ', this.port);
        });
    }
}

module.exports = Server;
