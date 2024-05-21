const mongoose = require('mongoose');

/**
 * Database class
 * @class Database
 * @description Database connection class
 * @exports Database class
 */
class Database {
  static async connect(MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI);
      // eslint-disable-next-line no-console
      console.log('Database connection successful');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(`Database connection error: ${error}`);
    }
  }
}

module.exports = {
  Database,
};
