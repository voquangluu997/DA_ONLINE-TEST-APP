const http = require("http");
const { disconnect } = require("process");
const app = require("./app");
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const Sequelize = require("sequelize");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const io = require("socket.io")(server);
// app.set("socketio", io);
let Player = require("./models/player");
let Room = require("./models/room");

let questionOrder = 0;
let defaultTime = 20;

let players = {};
let rooms = {};
let count = {};
let currentQuestionRow = [];
let currentRound = 0;
let timeRemaining = 0;
let playersOnline = 0;
let autoplayTime = 3;

const User = require("./models/user.model");
const Question = require("./models/question.model");
const e = require("express");
const { get } = require("./app");

app.get("/", (req, res, next) => {
  res.render("index");
});

server.listen(port, () => {
  console.log("server is running at port " + port);
});

io.on("connection", (socket) => {
  console.log(socket.id);
  getSession(socket);
  login(socket);
  createRoom(socket);
  joinRoom(socket);
  leaveRoom(socket);
  socket.on("client-send-room-info-before-start", (room) => {
    console.log("aa" ,room);
    rooms[room._name]._totalQuestion = room._totalQuestion;
    rooms[room._name]._time = room._time;
    rooms[room._name]._status = room._status;

    io.sockets.emit("update-rooms-status", room._name);
    io.to(room._name).emit("display-game-form");
    io.to(room._name).emit("update-room-info-before-start", room);
    nextQuestion(rooms[room._name]);
    let startTimer = setInterval(() => {
      if (rooms[room._name] == undefined) clearInterval(startTimer);
      else questionTimer(rooms[room._name]);
    }, 1000);
  });

  socket.on("click", function (data) {
    if (rooms[data.room]._isQuestionRunning) {
      rooms[data.room]._players[data.player]._locked = true;
      rooms[data.room]._players[data.player]._lockedAnswer = data.letter;
      socket.emit("lock_answer", data.letter);
    }
  });

  socket.on("logout", () => {
    console.log(" someone just logged out");
    if (isLogin(socket.username) && socket.username != undefined) {
      delete players[socket.username];
    }
  });
  socket.on("disconnect", () => {
    console.log(socket.username, " out");
    for (let room in rooms) {
      if (Object.keys(rooms[room]._players).indexOf(socket.username) >= 0) {
        var len = Object.keys(rooms[room]._players).length;
        if (len == 1) {
          delete rooms[room];
        } else {
          var master = rooms[room]._master;
          if (master == rooms[room]._players[socket.username]._name) {
            delete rooms[room]._players[socket.username];
            rooms[room]._master = Object.keys(rooms[room]._players)[0];
            let id = rooms[room]._players[rooms[room]._master]._socketId;
            io.to(`${id}`).emit("display-master", rooms[room]);
          } else delete rooms[room]._players[socket.username];
        }
        io.sockets.emit("update-rooms", rooms);
      }
    }
  });
});

function getSession(socket) {
  socket.on("client-send-session", (token) => {
    if (!token) socket.emit("display-login-form");
    else {
      jwt.verify(token, process.env.SECRET_KEY, (err, payload) => {
        if (payload) {
          User.findOne({ where: { id: payload.id } }).then((matchedUser) => {
            loginSuccess(socket, matchedUser, token);
          });
        }
      });
    }
  });
}

function login(socket) {
  socket.on("login", async (userInfo) => {
    User.findOne({ where: { username: userInfo.username } }).then(
      async (user) => {
        if (user) {
          const validPass = await bcrypt.compare(
            userInfo.password,
            user.password
          );
          if (!validPass) loginFailed(socket, "Invalid password");
          else {
            const token = jwt.sign({ id: user.id }, process.env.SECRET_KEY);
            loginSuccess(socket, user, token);
          }
        } else {
          loginFailed(socket, "username does not exist");
        }
      }
    );
  });
}

function loginSuccess(socket, user, token) {
  let isLG = isLogin(user.username);
  if (!isLG) {
    players[user.username] = new Player();
    players[user.username].name = user.username;
  }
  socket.username = user.username;
  players[user.username].socketId = socket.id;
  socket.emit("login-successfully", {
    token: token,
    name: players[user.username].name,
  });
  io.sockets.emit("update-rooms", rooms);
}

function loginFailed(socket, message) {
  socket.emit("login-failed", {
    message: message,
  });
}

function createRoomFailed(socket, message) {
  socket.emit("createRoom-failed", {
    message: message,
  });
}
function isLogin(username) {
  for (let player in players) if (player == username) return true;
  return false;
}

function createRoom(socket) {
  socket.on("createRoom", (room) => {
    let existedRoom = isExistedRoom(room.name);
    if (existedRoom || room.name == "") {
      let message = existedRoom
        ? " Create room failed ! Room name already exist !!!"
        : " Room name not be allowed empty ";
      createRoomFailed(socket, message);
    } else {
      socket.join(room.name);
      rooms[room.name] = new Room();
      rooms[room.name]._name = room.name;
      rooms[room.name]._master = socket.username;
      rooms[room.name]._players[socket.username] = players[socket.username];
      io.sockets.emit("update-rooms", rooms);
      socket.emit("createRoom-success", rooms[room.name]);
      socket.emit("display-master", rooms[room.name]);
    }
  });
}

function leaveRoom(socket) {
  socket.on("leaveRoom", (room) => {
    socket.leave(room.name);
    socket.emit("leaveRoom-success", rooms[room.name]);
    var len = Object.keys(rooms[room.name]._players).length;
    if (len == 1) {
      delete rooms[room.name];
    } else {
      var master = rooms[room.name]._master;
      if (master == rooms[room.name]._players[socket.username]._name) {
        delete rooms[room.name]._players[socket.username];
        rooms[room.name]._master = Object.keys(rooms[room.name]._players)[0];
        let id = rooms[room.name]._players[rooms[room.name]._master]._socketId;
        io.to(`${id}`).emit("display-master", rooms[room.name]);
      } else delete rooms[room.name]._players[socket.username];
    }
    io.sockets.emit("update-rooms", rooms);
  });
}

function isExistedRoom(roomName) {
  for (let room in rooms) {
    if (room == roomName) return true;
  }
  return false;
}

function joinRoom(socket) {
  socket.on("joinRoom", (roomName) => {
    socket.join(roomName);
    rooms[roomName]._players[socket.username] = players[socket.username];
    socket.emit("update-room-info-before-start", rooms[roomName]);
  });
  io.sockets.emit("update-rooms", rooms);
}

function nextQuestion(room) {
  room._indexQuestion++;
  if (room._indexQuestion >= room.totalQuestion) {
    // showScoreboardAndStopGame();
    return;
  }
  room._isQuestionRunning = true;

  timeRemaining = room._time;

  Question.findAll({ order: Sequelize.literal("rand()"), limit: 1 }).then(
    (q) => {
      room._currentQuestion = q[0];
      io.to(room._name).emit(
        "update_cau",
        room._indexQuestion + 1 + "/" + room._totalQuestion
      );
      io.to(room._name).emit("update_timer", timeRemaining);
      io.to(room._name).emit("update_question", q[0].content);
      io.to(room._name).emit("update_answers", {
        a: q[0].a,
        b: q[0].b,
        c: q[0].c,
        d: q[0].d,
      });

      // io.to(`${room._players[socket.username]._socketId}`).emit(
      //   "update_points",
      //   room._players[socket.username]._points
      // );

      // for (let player in room._players) {
      //   player.locked = false;
      // }
    }
  );
}

function endQuestion(room) {
  room._isQuestionRunning = false;
  let correctAnswer = room._currentQuestion.answer;
  let answers = ["a", "b", "c", "d"];
  let correctLetter = "";
  for (let ans of answers) {
    if (correctAnswer == room._currentQuestion[ans]) {
      correctLetter = ans;
      break;
    }
  }
  for (let player in room._players) {
    let letter = room._players[player]._lockedAnswer;
    if (room._currentQuestion.answer == room._currentQuestion[letter])
      room._players[player]._points++;
    io.to(room._name).emit("update_correct", correctLetter);
    io.to(`${room._players[player]._socketId}`).emit(
      "update_points",
      room.players[player]._points
    );
  }
  setTimeout(() => {
    nextQuestion(room);
  }, autoplayTime * 1000);
}

let autoplayCounterTimer = null;

function questionTimer(room) {
  if (room._isQuestionRunning) {
    timeRemaining--;

    io.emit("update_timer", timeRemaining);

    if (timeRemaining <= 0) {
      endQuestion(room);
    }
  }
}
