// 数据库的schema 数据结构
const mongoose = require("mongoose")
const Schema = mongoose.Schema; // 实例化schema
// 创建schema
const AddJPFoodRecSchema = new Schema({
    // 项目名称
    foodName:{
        type:String
    },
    // 项目图片
    pic:{
        type:String
    },
    // 项目描述
    desc:{
        type:String
    },    
    // 添加时间
    date:{
        type:Date,
        default:Date.now
    }
})

module.exports = AddJPFoodRec = mongoose.model("admin_JPfoodRec_items",AddJPFoodRecSchema) /*普通用户数据存储表*/ 