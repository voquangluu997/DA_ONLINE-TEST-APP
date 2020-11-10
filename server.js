const http = require("http");
const { disconnect } = require("process");
const app = require("./app");
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const Sequelize = require("sequelize");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const io = require("socket.io")(server);
app.set("socketio", io);

var onlineUsers = [];
var roomList = [];

const User = require("./models/user.model");
const Question = require("./models/question.model");
const e = require("express");

io.on("connection", (socket) => {
  socket.on("client-send-session", (token) => {
    jwt.verify(token, process.env.SECRET_KEY, (err, payload) => {
      if (payload) {
        User.findOne({ where: { id: payload.id } }).then((matchedUser) => {
          socket.username = matchedUser.username;
          if (onlineUsers.indexOf(matchedUser.username) < 0) {
            onlineUsers.push(socket.username);
          }
          socket.emit("login-successfully", token);
          socket.emit("server-send-current-user", socket.username);
          io.sockets.emit("server-send-online-users", onlineUsers);
          io.sockets.emit("server-send-rooms", roomList);
        });
      }
    });
  });

  console.log("co ket noi :  " + socket.id);

  socket.on("register", async (userInfo) => {
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
      socket.emit("login-failed", {
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
        socket.username = user.username;
        const token = jwt.sign({ id: saveUser.id }, process.env.SECRET_KEY);
        onlineUsers.push(socket.username);
        socket.emit("login-successfully", token);
        socket.emit("server-send-current-user", socket.username);
        io.sockets.emit("server-send-online-users", onlineUsers);
        io.sockets.emit("server-send-rooms", roomList);
      } catch (err) {
        throw err;
      }
    }
  });

  socket.on("login", async (userInfo) => {
    User.findOne({ where: { username: userInfo.username } }).then(
      async (user) => {
        if (user) {
          const validPass = await bcrypt.compare(
            userInfo.password,
            user.password
          );
          if (!validPass)
            socket.emit("login-failed", {
              message: "Invalid password",
            });
          else {
            if (onlineUsers.indexOf(socket.username) >= 0) {
              socket.emit("login-failed", {
                message: " User is logging in",
              });
            } else {
              socket.username = user.username;
              const token = jwt.sign({ id: user.id }, process.env.SECRET_KEY);

              if (roomList.indexOf(socket.username) < 0)
                onlineUsers.push(socket.username);
              socket.emit("login-successfully", token);
              socket.emit("server-send-current-user", socket.username);
              io.sockets.emit("server-send-online-users", onlineUsers);
              io.sockets.emit("server-send-rooms", roomList);
              // console.log(Object.keys(io.sockets.sockets));
              //get all socket id
            }
          }
        } else {
          socket.emit("login-failed", {
            message: "username does not exist",
          });
        }
      }
    );
  });

  socket.on("createRoom", (data) => {
    function isExistedRoom(roomName) {
      roomList.forEach((room) => {
        if (room.name == roomName) return true;
      });
      return false;
    }
    if (isExistedRoom(data.roomName) || data.roomName == "") {
      let message = " Create room failed ! Room name already exist !!!";
      if (data.roomName == "") {
        message = " Room name not be allowed empty ";
      }
      console.log(message);
      socket.emit("createRoom-failed", {
        message: message,
      });
    } else {
      socket.join(data.roomName);
      let addedRoom = {
        name: data.roomName,
        status: "waiting",
        totalQuestion: 20,
        time: 30,
        clients: [
          { name: socket.username, id: socket.id, roomMaster: true, score: 0 },
        ],
      };

      roomList.push(addedRoom);
      io.sockets.emit("server-send-rooms", roomList);
      socket.emit("createRoom-successfully-and-set-roomMaster", addedRoom);

      console.log(addedRoom);
      // socket.emit("server-send-roomMaster");
      io.sockets.emit("server-send-users-in-room", addedRoom.clients);
    }
  });

  socket.on("joinRoom", (data) => {
    socket.join(data);
    roomList.forEach((room) => {
      if (room.name == data) {
        room.clients.push({
          name: socket.username,
          id: socket.id,
          roomMaster: false,
          score: 0,
        });
        // console.log(room);
        io.sockets.emit("server-send-users-in-room", room.clients);
      }
    });
    // show arr socketId list in room
    // io.in(data).clients((error, clients) => {
    //   if (error) throw error;
    // });
  });

  socket.on("client-send-start-test", (room) => {
    Question.findAll({ order: Sequelize.literal("rand()"), limit: 10 }).then(
      (q) => {
        io.to(room.name).emit("server-send-question-list", q);
      }
    );
  });

  socket.on("client-send-submit", (answerList) => {
    console.log("hhhhhhhhhhhhhhhh");
  });

  socket.on("logout", () => {
    console.log(" co nguoi logout");
    onlineUsers.splice(onlineUsers.indexOf(socket.username), 1);
    socket.broadcast.emit("server-send-online-users", onlineUsers);
  });

  socket.on("disconnect", () => {
    console.log("disconnect");

    if (onlineUsers.indexOf(socket.username) >= 0)
      onlineUsers.splice(onlineUsers.indexOf(socket.username), 1);
    socket.broadcast.emit("server-send-online-users", onlineUsers);
  });
});

app.get("/", (req, res, next) => {
  res.render("index");
});

server.listen(port, () => {
  console.log("server is running at port " + port);
});
