const express = require('express');
const { instancesInfoController } = require('../controllers/instances');

class InstacesRoute {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.get('/', instancesInfoController.getAll)
    this.router.get('/:id', instancesInfoController.get)
  }

  getRouter() {
    return this.router;
  }
}

module.exports = { InstacesRoute: new InstacesRoute().getRouter() };
