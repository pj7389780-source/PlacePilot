const mongoose = require('mongoose');

const quizSchema = mongoose.Schema({
    quizcom : String,
    platform : String,
   difficulty: {
  type: String,
  enum: ["easy" ,"medium", "hard"]
   },
    topic : String,
    result: {
      type: String,
      enum: ["Good", "Average"]
    },
  userid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
  }
});


module.exports = mongoose.model("quiz", quizSchema);