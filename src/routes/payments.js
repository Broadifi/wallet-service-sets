const { PaymentsController } = require("../controllers/payments");
const { checkLogin } = require("../middleware/Auth");
const express = require("express");


class PaymentsRoutes {
    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    initializeRoutes() {
        this.router.get('/', checkLogin, PaymentsController.getAll)
    }

    getRouter() {
        return this.router;
    }
}

module.exports = { PaymentsRoutes: new PaymentsRoutes().getRouter() }