const mongoose = require('mongoose');

const problemSchema = mongoose.Schema({
    problemtitle : String,
    platform : String,
    difficulty: {
  type: String,
  enum: ["easy" ,"medium", "hard"]
},
    topic : String,
    language : String,
    userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }
});


module.exports = mongoose.model("problem", problemSchema);