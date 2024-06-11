const { createConsola } = require("consola");
const logger = createConsola({
    level: 3,
    fancy: true,
    formatOptions: {
        columns: 1,
        colors: true,
        compact: true,
        date: true,
    },
});

module.exports = logger