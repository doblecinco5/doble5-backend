const cron = require('node-cron');

const {
    liberarReservasExpiradas
} = require('./reservas');

const iniciarJobs = () => {

    cron.schedule('* * * * *', async () => {

        await liberarReservasExpiradas();

    });
};

module.exports = {
    iniciarJobs
};