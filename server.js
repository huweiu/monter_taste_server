const express = require("express")
const mongoose = require("mongoose")
const bodyParser = require("body-parser")
const cookieParser = require('cookie-parser');
const session = require("express-session")
const Expresscors = require('express-cors')
const passport = require("passport")
const multiparty = require('multiparty');  /*图片上传模块  即可以获取form表单的数据 也可以实现上传图片*/
const cors = require('cors')
const app = express()
// 服务器端口号
const port = process.env.PORT || 6000
// 引入api接口user.js
const users = require("./routes/api/users")
//console.log(users)
// 使用mongoose 连接数据库
const db = require("./config/keys").mongoURI
// 服务器设置跨域
// app.use(Expresscors({
//     allowedOrigins: [        
//         'http://localhost:8089' , 'http://localhost:6000',
//         'http://localhost:8090' , 'http://localhost:6000',        
//     ]
// }))

app.use(cors())

app.use(cookieParser());
// 利用中间件使用express-session
app.set('trust proxy', 1)
app.use(session({
    secret: 'secret',
    // name:"session_id",
    cookie: {maxAge: 1000*60*60*24 },  //设置maxAge是80000ms，即80s后session和相应的cookie失效过期
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
  }));
  console.log("huweiu44444444444444444")
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({extended:false}))

// /upload/lunbo/BF_QwLtoxpqWEW36GRCttY95.jpg
app.use('/upload/lunbo',express.static('upload/lunbo/'));
app.use('/upload/FoodRec',express.static('upload/FoodRec/'));
app.use('/upload/JPFoodRec',express.static('upload/JPFoodRec/'));
app.use('/upload/JCFood',express.static('upload/JCFood/'));
app.use('/upload/Classify',express.static('upload/Classify/'));
// 利用中间件使用routes
app.use("/api/users",users)
console.log("huweiu555555555555555555555555555")

// 连接数据库
mongoose.connect(db) // 返回值是一个promise
    .then(()=>{console.log("数据库已连接成功!")})
    .catch((error)=>{console.log(error)})
  // passport 一定要初始化
  app.use(passport.initialize());
  require("./config/passport")(passport)
// 监听端口
app.listen(port,()=>{
    console.log(`server is running at ${port}`)
})