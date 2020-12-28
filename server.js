const http = require("http");
const { disconnect } = require("process");
const app = require("./app");
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const Sequelize = require("sequelize");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const io = require("socket.io")(server);
let Player = require("./models/player");
let Room = require("./models/room");
let players = {};
let rooms = {};
let timeRemaining = 0;
let autoplayTime = 2;
let ltRoom = new Room();

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
  register(socket);
  createRoom(socket);
  joinRoom(socket);
  leaveRoom(socket);
  startGame(socket);
  luyentap(socket);
  click(socket);
  logout(socket);
  user_disconnect(socket);
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
function register(socket) {
  socket.on("register", async (userInfo) => {
    console.log("alo : ", userInfo);
    let message = "";
    const userExisted = await User.findOne({
      where: { username: userInfo.username },
    });
    const err =
      userInfo.username == "" ||
      userInfo.password == "" ||
      userInfo.password.length < 6 ||
      (userExisted && userExisted != null && userExisted != undefined);
    if (userInfo.username == "" || userInfo.password == "") {
      message = " username and password are not allowed to be empty ";
    } else if (userInfo.password.length < 6) {
      message = "password length must be at least 6 characters long";
    } else if (userExisted) {
      message = " Username already exist ";
    }
    if (err) {
      socket.emit("register-failed", {
        message: message,
      });
    } else {
      const user = new User({
        username: userInfo.username,
        password: userInfo.password,
      });
      user.password = await bcrypt.hashSync(userInfo.password, 10);
      try {
        const saveUser = await user.save();
        const token = jwt.sign({ id: saveUser.id }, process.env.SECRET_KEY);
        loginSuccess(socket, saveUser, token);
      } catch (err) {
        throw err;
      }
    }
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

function registerFailed(socket, message) {
  socket.emit("register-failed", {
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
      io.to(room.name).emit("update-user", rooms[room.name]);
    }
  });
}

function leaveRoom(socket) {
  socket.on("leaveRoom", (room) => {
    socket.leave(room.name);
    socket.emit("leaveRoom-success");
    io.to(room.name).emit("update-user", room);
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
    io.to(roomName).emit("update-user", rooms[roomName]);
  });
  io.sockets.emit("update-rooms", rooms);
}

function nextQuestion(socket, room) {
  room._indexQuestion++;
  if (room._indexQuestion >= room.totalQuestion) {
    showScoreboardAndStopGame(socket, room);
    return;
  }
  room._isQuestionRunning = true;
  timeRemaining = room._time;
  Question.findAll({ order: Sequelize.literal("rand()"), limit: 1 }).then(
    (q) => {
      room._currentQuestion = q[0];

      if (room._name == "luyentap") {
        socket.emit(
          "update_cau",
          room._indexQuestion + 1 + "/" + room._totalQuestion
        );
        socket.emit("update_timer", timeRemaining);
        socket.emit("update_question", q[0].content);
        socket.emit("update_answers", {
          a: q[0].a,
          b: q[0].b,
          c: q[0].c,
          d: q[0].d,
        });
      } else {
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
      }
    }
  );
}
function endQuestion(socket, room) {
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

    if (letter != "") {
      if (room._currentQuestion.answer == room._currentQuestion[letter])
        room._players[player]._points++;
    }
    if (room._name == "luyentap") {
      socket.emit("update_correct", correctLetter);
      socket.emit("update_points", room._players[player]._points);
    } else {
      io.to(room._name).emit("update_correct", correctLetter);
      io.to(`${room._players[player]._socketId}`).emit(
        "update_points",
        room._players[player]._points
      );
    }
    room._players[player]._lockedAnswer = "";
  }
  setTimeout(() => {
    nextQuestion(socket, room);
  }, autoplayTime * 1000);
}

function showScoreboardAndStopGame(socket, room) {
  let scoreBoard = [];
  for (let player in room._players) {
    scoreBoard.push({
      name: player,
      point: room._players[player]._points,
    });
  }
  scoreBoard.sort((a, b) => {
    return b.point - a.point;
  });
  if (room.name == "luyentap") socket.emit("show_scoreboard", scoreBoard);
  else io.to(room._name).emit("show_scoreboard", scoreBoard);
}

function prepareGame(room) {
  room._isQuestionRunning = false;
  room._currentQuestion = "";
  room._indexQuestion = -1;
  for (let player in room._players) {
    room._players[player]._points = 0;
    room._players[player]._lockedAnswer = "";
  }
}

let autoplayCounterTimer = null;

function questionTimer(socket, room) {
  if (room._isQuestionRunning) {
    timeRemaining--;

    io.emit("update_timer", timeRemaining);

    if (timeRemaining <= 0) {
      endQuestion(socket, room);
    }
  }
}

function luyentap(socket) {
  socket.on("luyentap", () => {
    ltRoom._players[socket.username] = players[socket.username];
    ltRoom._name = "luyentap";
    prepareGame(ltRoom);
    socket.emit("createRoom-success", ltRoom);
    socket.emit("setup-luyentap", ltRoom);
  });

  socket.on("client-send-luyentap-info-before-start", (room) => {
    prepareGame(ltRoom);
    ltRoom._totalQuestion = room._totalQuestion;
    ltRoom._time = room._time;
    ltRoom._players[socket.username]._ = 0;

    socket.emit("update-room-info-before-start", ltRoom);
    socket.emit("display-game-form");
    nextQuestion(socket, ltRoom);
    socket.on("luyentap-click", (letter) => {
      if (ltRoom._isQuestionRunning) {
        ltRoom._players[socket.username]._locked = true;
        ltRoom._players[socket.username]._lockedAnswer = letter;
        socket.emit("lock_answer", letter);
      }
    });

    startTimer = setInterval(() => {
      if (
        ltRoom == undefined ||
        (ltRoom._indexQuestion == ltRoom._totalQuestion - 1 &&
          timeRemaining == 0)
      )
        clearInterval(startTimer);
      else questionTimer(socket, ltRoom);
    }, 1000);
  });
}

function click(socket) {
  socket.on("click", function (data) {
    if (rooms[data.room]._isQuestionRunning) {
      rooms[data.room]._players[data.player]._locked = true;
      rooms[data.room]._players[data.player]._lockedAnswer = data.letter;
      socket.emit("lock_answer", data.letter);
    }
  });
}

function user_disconnect(socket) {
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

          io.to(room).emit("update-user", rooms[room]);
        }
        io.sockets.emit("update-rooms", rooms);
      }
    }
  });
}

function startGame(socket) {
  socket.on("client-send-room-info-before-start", (room) => {
    rooms[room._name]._totalQuestion = room._totalQuestion;
    rooms[room._name]._time = room._time;
    rooms[room._name]._status = room._status;
    prepareGame(rooms[room._name]);
    console.log(rooms[room._name]);

    io.sockets.emit("update-rooms", rooms);
    io.to(room._name).emit("display-game-form");
    io.to(room._name).emit("update-room-info-before-start", room);
    nextQuestion(socket, rooms[room._name]);
    startTimer = setInterval(() => {
      if (
        rooms[room._name] == undefined ||
        (rooms[room._name]._indexQuestion ==
          rooms[room._name]._totalQuestion - 1 &&
          timeRemaining == 0)
      )
        clearInterval(startTimer);
      else questionTimer(socket, rooms[room._name]);
    }, 1000);
  });
}

function logout(socket) {
  socket.on("logout", () => {
    console.log(" someone just logged out");
    if (isLogin(socket.username) && socket.username != undefined) {
      delete players[socket.username];
    }
  });
}
