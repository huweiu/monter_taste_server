// 数据库的schema 数据结构
const mongoose = require("mongoose")
const Schema = mongoose.Schema; // 实例化schema
// 创建schema
const UserSchema = new Schema({
    // 用户名
    userName:{
        type:String
    },
    // 密码
    passWord:{
        type:String
    },
    // 手机号
    phoneNum:{
        type:String
    },
    // 注册时间
    date:{
        type:Date,
        default:Date.now
    }
})

module.exports = User = mongoose.model("users_clients",UserSchema) /*普通用户数据存储表*/ 