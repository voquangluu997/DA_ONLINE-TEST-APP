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

  A: {
    type: Sequelize.STRING,
  },
  B: {
    type: Sequelize.STRING,
  },
  C: {
    type: Sequelize.STRING,
  },
  D: {
    type: Sequelize.STRING,
  },
  answer: {
    type: Sequelize.STRING,
  },
});
