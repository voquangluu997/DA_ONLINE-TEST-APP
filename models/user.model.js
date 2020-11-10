const Sequelize = require("sequelize");
const db = require("../database/db.js");

module.exports = db.sequelize.define("users", {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
  },
  username: {
    type: Sequelize.STRING,
  },

  password: {
    type: Sequelize.STRING,
  },
});
