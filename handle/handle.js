const Question = require('../models/question.model');
const app = require("./app");
const io = app.get("socketio");


module.exports.getQuestionList = async (time,numOfQuestion)=>{

    setInterval(()=>{
        


    },1000);

   let listQuestion = Question.findAll({ order: Sequelize.literal('rand()'), limit: numOfQuestion });
   return listQuestion;




}