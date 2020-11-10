const socket = io();

socket.on("login-failed", (data) => {
  $("#login-message").html("");
  $("#login-message").append(
    "<div class='alert alert-danger'>" + data.message + "</div>"
  );
});

socket.on("login-successfully", (session) => {
  localStorage.setItem("auth", session);
  $("#loginForm").fadeOut();
  $("#waitingRoom").fadeIn();
  $("#joinRoom").fadeOut();
});

socket.on("server-send-online-users", function (data) {
  $("#boxContent").html("");
  data.forEach((i) => {
    $("#boxContent").append("<div class='user'>" + i + "</div>");
  });
});

socket.on("server-send-users-in-room", (userList) => {
  $("#boxUsersInRoom").html("");
  userList.forEach((e) => {
    $("#boxUsersInRoom").append("<div class='user'>" + e.name + "</div>");
  });
});

socket.on("server-send-current-user", (data) => {
  $("#currentUser").html(data);
});

socket.on("server-send-rooms", function (roomList) {
  $("#listRoom").html("<div class='header'>Danh sách phòng thi </div>");
  roomList.map((room) => {
    $("#listRoom").append(
      `<button class='btn btn-danger boxRoom' id = '${room.name}' >${room.name} 
      </button>`
    );

    $("#" + room.name).click(() => {
      socket.emit("joinRoom", room.name);
      $("#waitingRoom").hide();
      $("#loginForm").hide();
      $("#joinRoom").show(100);
    });
  });
});

socket.on("server-send-question-list", (questionList) => {
  $("#startBox").fadeOut();
  $("#questionBox").fadeIn();
  let listCorrectAnswer = [];
  let listResult = [];
  questionList.map((q, i) => {
    listCorrectAnswer.push(q.answer);
    $("#questionBox").append(
      `<div class="font-weight-bold font-italic"> Q.${i + 1} : ${
        q.content
      } </div>`
    );
    $("#questionBox").append(
      `<div class='form-check'> 
        <input class='form-check-input' type='radio' name='answer${i}' id='question${i}A' value='A'> 
         <label class='form-check-label' for='question${i}A'> A. ${q.A}</label> </div>
         
         <div class='form-check'> 
        <input class='form-check-input' type='radio' name='answer${i}' id='question${i}B' value='B'> 
         <label class='form-check-label' for='question${i}B'> B. ${q.B}</label> </div>

         <div class='form-check'> 
        <input class='form-check-input' type='radio' name='answer${i}' id='question${i}C' value='C'> 
         <label class='form-check-label' for='question${i}C'> C. ${q.C}</label> </div>

         <div class='form-check'> 
        <input class='form-check-input' type='radio' name='answer${i}' id='question${i}D' value='D'> 
         <label class='form-check-label' for='question${i}D'> D. ${q.D}</label> </div>

         <div id='correctAnswer${i}'>  </div>
         `
    );
  });

  $("#btnSubmit").css("display", "block");

  $("#btnSubmit").click(() => {
    var answer;
    for (let i = 0; i < 10; i++) {
      answer = $("input[name='answer" + i + "']:checked").val();
      if (listCorrectAnswer[i] == questionList[i][answer])
        $(`#correctAnswer${i}`).append(
          `<div class="text-success font-weight-bold">  Đúng : ${listCorrectAnswer[i]}</div>`
        );
      else
        $(`#correctAnswer${i}`).append(
          `<div class="text-danger font-weight-bold">  Sai : ${listCorrectAnswer[i]}</div>`
        );
    }
    socket.emit("client-send-submit", "hihi");
  });
});

$(document).ready(function () {
  if (localStorage.getItem("auth")) {
    socket.emit("client-send-session", localStorage.getItem("auth"));
  } else {
    $("#loginForm").show();
    $("#waitingRoom").hide();
    $("#joinRoom").hide();
  }

  $("#btn-login").click(() => {
    socket.emit("login", {
      username: $("#username").val(),
      password: $("#password").val(),
    });
  });

  $("#btn-register").click(function () {
    socket.emit("register", {
      username: $("#username").val(),
      password: $("#password").val(),
    });
  });

  $("#btnLogout").click(() => {
    socket.emit("logout");
    localStorage.removeItem("auth");
    $("#waitingRoom").fadeOut();
    $("#joinRoom").fadeOut();
    $("#loginForm").fadeIn();
  });

  $("#btnTaophong").click(function () {
    socket.emit("createRoom", {
      roomName: $("#txtTenphong").val(),
    });
  });

  socket.on("createRoom-failed", (data) => {
    alert(data.message);
  });

  socket.on("createRoom-successfully-and-set-roomMaster", (room) => {
    $("#info-tenphong").html(room.name);
    $("#waitingRoom").hide();
    $("#loginForm").hide();
    $("#joinRoom").show();
    $("#questionBox").hide();

    $("#startBox").append(
      "<button class='btn btn-success' id='btnStart' > Bắt đầu thi</button>"
    );
    $("#roomStatus").fadeOut();

    $("#btnStart").click(() => {
      room.totalQuestion = $("#txtSocauhoi").val();
      room.time = $("#txtThoigian").val();
      room.status = "starting";
      $("#info-socauhoi").html(room.totalQuestion);
      $("#info-thoigian").html(room.time);
      socket.emit("client-send-start-test", room);
      let time = room.time;
      let h, m, s;
      h = Math.floor(time / 60);
      m = time % 60;
      s = 0;
      let setTimer = setInterval(() => {
        if (h == 0 && m == 0 && s == 0) {
          clearInterval(setTimer);
        }
        if (s < 0) {
          s = 59;
          m--;
        }
        if (m < 0) {
          m = 59;
          h--;
        }
        hour = h < 10 ? "0" + h : h;
        minute = m < 10 ? "0" + m : m;
        second = s < 10 ? "0" + s : s;

        $("#info-thoigian").html(hour + " : " + minute + " : " + second);
        s--;
      }, 1000);
    });
  });
});
