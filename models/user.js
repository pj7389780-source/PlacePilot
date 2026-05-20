const mongoose = require('mongoose');
mongoose.connect("mongodb://localhost:27017/mini-1")

const userSchema = mongoose.Schema({
    username : String,
    name : String,
    age : Number,
    email : String,
    goal : String,
    password : String
})

module.exports = mongoose.model("user", userSchema);