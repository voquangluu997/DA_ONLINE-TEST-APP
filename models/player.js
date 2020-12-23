class Player {
  constructor() {
    this.points = 0;
    this.locked = false;
  }

  set name(name) {
    this._name = name;
  }

  get name() {
    return this._name;
  }

  set room(room) {
    this._room = room;
  }

  get room() {
    return this._room;
  }

  set points(points) {
    this._points = points;
  }

  get points() {
    return this._points;
  }

  get loggedIn() {
    return this.name;
  }

  set socketId(socketId) {
    this._socketId = socketId;
  }

  get socketId() {
    return this._socketId;
  }

  set lockedAnswer(lockedAnswer) {
    this._lockedAnswer = lockedAnswer;
  }

  get lockedAnswer() {
    return this._lockedAnswer;
  }
}

module.exports = Player;
