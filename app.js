require("dotenv").config();
const express = require("express");
const app = express();
let cookieParser = require('cookie-parser');


const bodyParser = require("body-parser");
const mysql = require("mysql2");
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.SECRET_KEY));	


let con = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
});

con.connect(function (err) {
  if (err) throw err;
  console.log("Connected!!!");
});

module.exports = app;


