const express = require('express');
const { checkLogin } = require('../middleware/Auth');
const { instaceConfigController } = require('../controllers/instances');

class InstacesRoute {
  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  initializeRoutes() {
    this.router.get('/', instaceConfigController.getAll)
    this.router.get('/:id', instaceConfigController.get)
  }

  getRouter() {
    return this.router;
  }
}

module.exports = { InstacesRoute: new InstacesRoute().getRouter() };
