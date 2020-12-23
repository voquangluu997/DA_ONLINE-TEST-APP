const socket = io();
let lastLocked = "";
let lastCorrect = "";
let lastWrong = "";

socket.on("login-failed", (data) => {
  $("#login-message").html("");
  $("#login-message").append(
    "<div class='alert alert-danger' id='error_login_message'>" +
      data.message +
      "</div>"
  );
});

socket.on("createRoom-failed", (data) => {
  alert(data.message);
});

socket.on("display-game-form", () => {
  display_game_form();
});

socket.on("createRoom-success", (room) => {
  display_prepareGame_form();
  update_room_info(room);
  document.getElementById("txtThoigian").value = room._time;
  document.getElementById("txtSocauhoi").value = room._totalQuestion;
});

socket.on("leaveRoom-success", (room) => {
  display_rooms_form();
  $("#roomStatus").css("display", "inline-block");
  $("#btnStart").css("display", "none");
});

socket.on("update_cau", function (cau) {
  $("#cau").html(cau);
});

socket.on("update_timer", function (thoigian) {
  $("#thoigian").html(thoigian);
});

socket.on("update_question", function (question) {
  $("#question").html(question);
});

socket.on("update_points", function (points) {
  $("#dung").html(points);
});

socket.on("update_correct", function (letter) {
  if (letter !== lastLocked) {
    $("#tile-" + lastLocked)
      .removeClass("locked")
      .addClass("wrong");
    lastWrong = lastLocked;
  } else {
    $("#tile-" + lastLocked).removeClass("locked");
  }

  $("#tile-" + letter).addClass("correct");
  lastCorrect = letter;
});

socket.on("lock_answer", function (letter) {
  $("#tile-a").removeClass("locked");
  $("#tile-b").removeClass("locked");
  $("#tile-c").removeClass("locked");
  $("#tile-d").removeClass("locked");
  $("#tile-" + letter).addClass("locked");
  lastLocked = letter;
});

socket.on("update_answers", function (data) {
  $("#answer-a").html(data.a);
  $("#answer-b").html(data.b);
  $("#answer-c").html(data.c);
  $("#answer-d").html(data.d);

  $("#counter-a").css("display", "none");
  $("#counter-b").css("display", "none");
  $("#counter-c").css("display", "none");
  $("#counter-d").css("display", "none");

  if (lastLocked) {
    $("#tile-" + lastLocked).removeClass("locked");
    lastLocked = "";
  }

  if (lastCorrect) {
    $("#tile-" + lastCorrect).removeClass("correct");
    lastCorrect = "";
  }

  if (lastWrong) {
    $("#tile-" + lastWrong).removeClass("wrong");
    lastWrong = "";
  }
});

socket.on("update-room-info-before-start", (room) => {
  update_room_info(room);
});

socket.on("login-successfully", (data) => {
  localStorage.setItem("auth", data.token);
  display_rooms_form();
  $("#player-name").html(data.name);
  $("#current-player").html(data.name);
});

socket.on("display-login-form", () => {
  display_login_form();
});

socket.emit("client-send-session", localStorage.getItem("auth"));

socket.on("update-rooms", (rooms) => {
  $("#roomList").html("");
  for (let room in rooms) {
    $("#roomList").append(
      `<button class='btn btn-danger btn-room' id = '${room}' >${room} 
      </button>`
    );

    $("#" + room).click(() => {
      socket.emit("joinRoom", room);
      display_prepareGame_form();
    });

    socket.emit("startGame" + room, (room) => {});
  }
});

socket.on("display-master", (room) => {
  $("#roomStatus").css("display", "none");
  $("#btnStart").css("display", "inline-block");
  document.getElementById("txtThoigian").disabled = false;
  document.getElementById("txtSocauhoi").disabled = false;
  $("#btnStart").click(() => {
    console.log(room);
    room._totalQuestion = $("#txtSocauhoi").val();
    room._time = $("#txtThoigian").val();
    room._status = "starting";
    socket.emit("client-send-room-info-before-start", room);
    // socket.emit("e");
  });
});
socket.on("update-rooms-status", (room) => {
  $("#" + room).removeClass("btn-danger");
  $("#" + room).addClass("btn-success");
});

socket.on("server-send-questions", (data) => {});

$(document).ready(function () {
  $("#btn-login").click(() => {
    socket.emit("login", {
      username: $("#username").val(),
      password: $("#password").val(),
    });
  });

  $("#btnLogout").click(() => {
    socket.emit("logout");
    localStorage.removeItem("auth");
    display_login_form();
  });

  // $("#btn-register").click(function () {
  //   socket.emit("register", {
  //     username: $("#username").val(),
  //     password: $("#password").val(),
  //   });
  // });

  $("#btnTaophong").click(function () {
    socket.emit("createRoom", {
      name: $("#txtTenphong").val(),
    });
  });

  $("#btnBack").click(function () {
    socket.emit("leaveRoom", {
      name: $("#phong").text(),
    });
  });

  let lt = ["a", "b", "c", "d"];
  for (let letter of lt) {
    $("#tile-" + letter).click(function () {
      socket.emit("click", {
        letter: letter,
        room: document.getElementById("phong").textContent,
        player: document.getElementById("player-name").textContent,
      });
    });
  }
});

function display_login_form() {
  $("#login").css("display", "table");
  $("#error_login_message").css("display", "none");
  $("#register").css("display", "none");
  $("#room-parent").css("display", "none");
  $("#prepareGame").css("display", "none");
  $("#game").css("display", "none");
}

function display_register_form() {
  $("#login").css("display", "none");
  $("#error_register_message").css("display", "none");
  $("#register").css("display", "table");
  $("#room-parent").css("display", "none");
  $("#prepareGame").css("display", "none");
  $("#game").css("display", "none");
}

function display_rooms_form() {
  $("#login").css("display", "none");
  $("#register").css("display", "none");
  $("#room-parent").css("display", "table");
  $("#prepareGame").css("display", "none");
  $("#game").css("display", "none");
}

function display_prepareGame_form() {
  $("#login").css("display", "none");
  $("#error_login_message").css("display", "none");
  $("#register").css("display", "none");
  $("#room-parent").css("display", "none");
  $("#prepareGame").css("display", "table");
  $("#game").css("display", "none");
  $("#prepareGame-body").css("display", "contents");
}

function display_game_form() {
  $("#login").css("display", "none");
  $("#error_login_message").css("display", "none");
  $("#register").css("display", "none");
  $("#room-parent").css("display", "none");
  $("#prepareGame-body").css("display", "none");
  $("#game").css("display", "table");
}

function update_room_info(room) {
  $("#thoigian").html(room._time);
  $("#phong").html(room._name);
  $("#cau").html(room._totalQuestion);
}
