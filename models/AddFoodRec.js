// 数据库的schema 数据结构
const mongoose = require("mongoose")
const Schema = mongoose.Schema; // 实例化schema
// 创建schema
const AddFoodRecSchema = new Schema({
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

module.exports = AddItem = mongoose.model("admin_foodRec_items",AddFoodRecSchema) /*普通用户数据存储表*/ 