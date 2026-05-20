const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    username : String,
    name : String,
    age : Number,
    email : String,
    goal : String,
    password : String
})

module.exports = mongoose.model("user", userSchema);