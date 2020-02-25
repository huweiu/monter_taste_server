// 数据库的schema 数据结构
const mongoose = require("mongoose")
const Schema = mongoose.Schema; // 实例化schema
// 创建schema
const AdminUserSchema = new Schema({
    // 用户名
    name:{
        type:String
    },
    // 密码
    password:{
        type:String
    },
    // 邮箱
    email:{
        type:String
    },
    // 注册员工身份
    identity:{
        type:String
    },
    // 注册时间
    date:{
        type:Date,
        default:Date.now
    }
})

module.exports = AdminUser = mongoose.model("admin_users_clients",AdminUserSchema) /*普通用户数据存储表*/ 