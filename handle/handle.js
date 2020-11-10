const Question = require('../models/question.model');
const io = app.get("socketio");


module.exports.getQuestionList = async (time,numOfQuestion)=>{

    setInterval(()=>{
        


    },1000);

   let listQuestion = Question.findAll({ order: Sequelize.literal('rand()'), limit: numOfQuestion });




}