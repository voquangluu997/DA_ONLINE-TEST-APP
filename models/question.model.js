const Sequelize = require("sequelize");
const db = require("../database/db.js");

module.exports = db.sequelize.define("questions", {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
  },
  content: {
    type: Sequelize.STRING,
  },

  a: {
    type: Sequelize.STRING,
  },
  b: {
    type: Sequelize.STRING,
  },
  c: {
    type: Sequelize.STRING,
  },
  d: {
    type: Sequelize.STRING,
  },
  answer: {
    type: Sequelize.STRING,
  },
});
