class Room {
  constructor() {
    this.status = "waiting";
    this.players = {};
    this.totalQuestion = 10;
    this.time = 20;
    this.indexQuestion = -1;
    this.isQuestionRunning = false;
  }

  set name(name) {
    this._name = name;
  }

  get name() {
    return this._name;
  }

  set status(status) {
    this._status = status;
  }

  get status() {
    return this._status;
  }

  set players(players) {
    this._players = players;
  }

  get players() {
    return this._players;
  }

  set master(master) {
    this._master = master;
  }

  get master() {
    return this._master;
  }

  set time(time) {
    this._time = time;
  }

  get time() {
    return this._time;
  }

  set totalQuestion(totalQuestion) {
    this._totalQuestion = totalQuestion;
  }

  get totalQuestion() {
    return this._totalQuestion;
  }

  set questions(questions) {
    this._questions = questions;
  }

  get questions() {
    return this._questions;
  }

  set currentQuestion(currentQuestion) {
    this._currentQuestion = currentQuestion;
  }

  get currentQuestion() {
    return this._currentQuestion;
  }

  set indexQuestion(indexQuestion) {
    this._indexQuestion = indexQuestion;
  }

  get indexQuestion() {
    return this._indexQuestion;
  }

  set isQuestionRunning(isQuestionRunning) {
    this._isQuestionRunning = isQuestionRunning;
  }

  get isQuestionRunning() {
    return this._isQuestionRunning;
  }

}

module.exports = Room;
