// 数据库的schema 数据结构
const mongoose = require("mongoose")
const Schema = mongoose.Schema; // 实例化schema
// 创建 图形验证码 的 schema
const CaptchaSchema = new Schema({
    // 用户名
    captchaStr:{
        type:String
    },    
    // 注册时间
    date:{
        type:Date,
        default:Date.now
    }
})

module.exports = User = mongoose.model("captchas",CaptchaSchema) /*普通用户数据存储表*/ 