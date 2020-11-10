const Sequelize = require("sequelize");
const db = {};
require("dotenv").config();
const sequelize = new Sequelize(
  process.env.MYSQL_DB,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    dialect: "mysql",
    // operatorsAliases: false,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: false,
    },
  }
);

db.sequelize = sequelize;
db.Sequelize = Sequelize;
module.exports = db;
