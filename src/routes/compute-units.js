const express = require('express');
const { computeUnitsController } = require('../controllers/compute-units');

class ComputeUnitsRoute {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.get('/', computeUnitsController.getAll)
    this.router.get('/:id', computeUnitsController.get)
  }

  getRouter() {
    return this.router;
  }
}

module.exports = { computeUnitsRoute: new ComputeUnitsRoute().getRouter() };
