// 数据库的schema 数据结构
const mongoose = require("mongoose")
const Schema = mongoose.Schema; // 实例化schema
// 创建schema
const AddClassifyListSchema = new Schema({ 
    // 商品分类编号
    classifyNo:{
        type:String
    },
    // 商品分类名称
    classifyName:{
        type:String
    },
    // 商品分类描述
    classifyDesc:{
        type:String
    },     
    // 添加时间
    date:{
        type:Date,
        default:Date.now
    }
})

module.exports = ClassifyList = mongoose.model("admin_classifylist_items",AddClassifyListSchema) /*普通用户数据存储表*/ 