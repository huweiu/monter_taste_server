// 发送短信验证码的数据库Schema
const mongoose = require("mongoose")
// 实例化schema
const Schema = mongoose.Schema
// 创建Schema
const smsCodeSchema = new Schema({
    phoneNum:{
        type:String,
        required:true
    },
    Code:{
        type:String,
        required:true
    },
    date:{
        type:Date,
        default:Date.now
    }
})

module.exports = phoneCode = mongoose.model("phone_message_codes",smsCodeSchema)