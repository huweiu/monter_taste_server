// 数据库的schema 数据结构
const mongoose = require("mongoose")
const Schema = mongoose.Schema; // 实例化schema
// 创建schema
const AddCartDataSchema = new Schema({ 
    // 用户ID
    user_id:{
        type:String
    },
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
    // 单品添加数量
    number:{
        type:Number
    },
    // 是否点击选中
    choiceFlag:{
        type:Boolean
    }, 
    // 是否付付过款标志
    isSale:{
        type:Boolean
    },
    
    // 添加时间
    date:{
        type:Date,
        default:Date.now
    }
})

module.exports = CartData = mongoose.model("admin_Carts",AddCartDataSchema) /*普通用户数据存储表*/ 