const mongoose = require('mongoose');

const companySchema = mongoose.Schema({
    companyname : String,
    position : String,
    platform : String,
    reached : String,
    feedbackrecieved : String,
    result : String,
    userid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user"
        }
});


module.exports = mongoose.model("company", companySchema);