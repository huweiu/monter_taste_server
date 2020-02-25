// 数据库的schema 数据结构
const mongoose = require("mongoose")
const Schema = mongoose.Schema; // 实例化schema
// 创建schema
const AddAddressSchema = new Schema({ 
    // 每条地址的唯一标识
    id:{
        type:String
    },
    // 用户id
    user_id:{
        type:String
    },
    // 收货人姓名
    name:{
        type:String
    },
    // 收货人手机号
    tel:{
        type:String
    },
    // 省份
    province:{
        type:String
    },
    // 城市
    city:{
        type:String
    },
    // 区县
    county:{
        type:String
    },
    // 详细地址
    addressDetail:{
        type:String
    },
    // 地区编码
    areaCode:{
        type:String
    },
    // 邮政编码
    postalCode:{
        type:String
    },
    // 是否为默认地址
    isDefault:{
        type:Boolean
    },     
    // 添加时间
    date:{
        type:Date,
        default:Date.now
    }
})

module.exports = Address = mongoose.model("admin_Address_items",AddAddressSchema) /*普通用户数据存储表*/ 