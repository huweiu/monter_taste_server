// 数据库的schema 数据结构
const mongoose = require("mongoose")
const Schema = mongoose.Schema; // 实例化schema
// 创建schema
const AddJCFoodSchema = new Schema({ 
    // 项目名称
    foodName:{
        type:String
    },
    // 项目图片
    pic:{
        type:String
    },
    // 商品价格
    price:{
        type:String
    },
    // 商品折扣
    discount:{
        type:String
    },
    // 商品配送费
    fee:{
        type:String
    },
    // 商品好评得分
    rate:{
        type:String
    },
    // 商品月售订单量
    order:{
        type:String
    },
    // 商品组成信息
    foodinfo:{
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

module.exports = JCFood = mongoose.model("admin_JCFood_items",AddJCFoodSchema) /*普通用户数据存储表*/ 