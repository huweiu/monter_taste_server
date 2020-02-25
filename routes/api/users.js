const express = require("express")
const router = express.Router() // 创建路由器
const User = require("../../models/User")
const AdminUser = require("../../models/AdminUser")
const AddItem = require("../../models/AddItem")
const FoodRec = require("../../models/AddFoodRec")
const AddJPFoodRec = require("../../models/JPFoodRec")
const JCFood = require("../../models/JCFood")
const ClassifyList = require("../../models/ClassifyList")
const Classify = require("../../models/Classify")
const AddressAdmin = require("../../models/AddressAdmin")
const CartData = require("../../models/CartData") // 购物车数据模型
const phoneCode = require("../../models/SmsCode") // 短信验证码
const captchaCode = require("../../models/Captcha")
const sms_util = require("../../util/sms_util") // 引入发短信的模块
const svgCaptcha = require('svg-captcha') // 一次性图形验证码
const jwt = require('jsonwebtoken');
const keys = require("../../config/keys")
const passport = require("passport")
const passportjwt = require("passport-jwt")
const multiparty = require('multiparty');  /*图片上传模块  即可以获取form表单的数据 也可以实现上传图片*/
const fs = require("fs")

// $router GET /api/users/test/
// @desc 测试接口是否可用
// 返回请求json数据
// @access public
// router.get("/test",(req,res)=>{
//     res.json({"msg":"hello world"})
// })

// $router GET /api/users/sendcode
// @desc 用户短信登录,发送短信接口获取短信验证码
// 返回请求json数据
// @access public
router.get("/sendcode",(req,res)=>{
    let phoneCodeFields = {} 
    // 获取请求参数数据
    let phoneNum = req.query.phoneNum    
    // 处理数据，随机生成6位验证码
    let Code = sms_util.randomCode(6)
    if(phoneNum) phoneCodeFields.phoneNum = phoneNum
    if(Code) phoneCodeFields.Code = Code    
    // 调用短信平台发送短信
    sms_util.sendCode(phoneNum,Code,(success)=>{
        // success表示发送短信成功
        if(success){
            // 将获取(生成的)的验证码存到数据库
            // 根据手机号码查询数据是否有手机数据，如果没有则插入数据库，如果有则修改数据库中的验证码为最新值
            phoneCode.findOne({phoneNum})
                .then((phonecode)=>{
                    if(phonecode){
                        // 数据库中存在手机号对应的信息,修改数据库中的验证码为最新值
                        phoneCode.findOneAndUpdate({phoneNum:phoneNum},{$set:phoneCodeFields},{new:true})
                            .then((phone)=>{
                                if(phone){
                                    console.log("短信验证码更新数据库成功!")
                                }
                            })
                            .catch(error=>{console.log(error)})
                    }else{
                        // 数据库中不存在手机号，第一次则插入数据库
                        new phoneCode(phoneCodeFields).save()
                            .then((phone)=>{
                                if(phone){
                                    console.log("数据库存入短信验证码成功!")
                                }                              
                            })
                    }
                    console.log(`向${phoneNum}发送验证码短信: ${Code}`);
                })
        }else{            
            res.json({errCode:1,msg:"短信验证码发送失败!"})
            return
        }
    })
})

// $router POST /api/users/login_sms
// @desc 用户短信登录,获取到短信验证码之后登陆
// 返回请求json数据
// @access public
router.post("/loginSms",(req,res)=>{
    console.log("22222222")
    //if(req.headers["origin"] == "null" || req.headers["origin"].startsWith("http://localhost")){
        //res.setHeader("Access-Control-Allow-Origin","*")
        //允许请求方式
        //res.header("Access-Control-Allow-Origin","*")
        //res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE");
   // }  
    let phoneCodeFields = {}
    let phoneNum = req.body.phoneNum // 获取上传的手机号码
    //console.log(phoneNum)
    let code = req.body.Code // 获取上传的短信验证码
    if( phoneNum ) phoneCodeFields.phoneNum = phoneNum
    // 对比上传的验证码和数据库中存储的验证码是否一致
    // 根据手机号查询数据库存储短信验证码的表    
    phoneCode.findOne({phoneNum}, function(error,phone){ 
        if(error){
            console.log("查询短信验证码失败!")
        }else{
            if(phone){
                // 查询成功，拿到查询结果
                console.log(phone.Code) // 得到数据库中存储的验证码
                // 和从前端上送的验证码做对比
                if(code === phone.Code){
                    //res.send({errCode:0,msg:"验证码校验成功!"})
                    console.log("验证码校验成功!")
                }else{
                    res.send({errCode:1,msg:"短信验证码不正确!"})
                    return
                }               
            }else{
                res.send({errCode:1,msg:"手机号码不正确!"})
                return
            }
            // 短信验证码校验之后,查询数据库中用户信息表中是否存在用户信息，如果有直接登录，如果没有自动注册登录
            // 根据手机号码查询用户信息表
            User.findOne({phoneNum},(error,user)=>{
                if(error){
                    throw error
                }else{
                    if(user){
                        // 用户信息如果存在,把数据库中给用户分配的id设置在session中                                       
                        req.session.userid = user._id
                        res.send({errCode:0,data:user})
                    }else{
                        // 如果数据库中用户信息不存在,把用户信息存到数据库
                        const userNew = new User(phoneCodeFields)
                        userNew.save((error,user)=>{
                            if(error){
                                throw error
                            }else{
                                if(user){
                                    req.session.userid = user._id
                                    res.send({errCode:0,data:user})
                                }else{
                                    res.send({errCode:1,msg:"保存用户信息失败!"})
                                    return
                                }
                            }
                        })                        
                    }
                }
            })
        }
    }) 
})

// $router POST /api/users/login_pwd
// @desc 用户密码登录
// 返回请求json数据
// @access public
router.post("/login_pwd",(req,res)=>{
    let {userName,passWord,captcha,captcha_id} = req.body
    console.log(userName)
    console.log(passWord)
    console.log(captcha)
    console.log(captcha_id)
    let _id  = captcha_id

    // 根据在数据中存储的图形验证码id 查询图形验证码,做验证码校验
    captchaCode.findOne({_id},(error,data)=>{
        if(error){            
            throw error
        }else{            
            if(data){                
                // 根据id能查询到数据,校验图形验证码
                if(data.captchaStr !== captcha.toLowerCase() ){
                    res.send({errCode:1,msg:"验证码不正确"})
                    return
                }else{                    
                    // 验证码校验成功删除数据库中的保存的验证码
                    captchaCode.findOneAndDelete({_id},(error,data)=>{
                        if(error){
                            throw error
                        }else{                           
                            if(data){
                                // 删除数据库中验证码成功
                                console.log(data)                               
                            }
                        }                        
                        // 用户名是否重复在前台已经做了校验，所以校验一下输入的密码是否正确
                        User.findOne({userName},(error,user)=>{
                            if(error){
                                throw error
                            }else{                                
                                if(user){                                    
                                    // 数据库中获取到用户信息,取出保存的密码
                                    if(user.passWord !== passWord){
                                        res.send({errCode:2,msg:"密码错误"})
                                        return
                                    }
                                }else{
                                    res.send({errCode:2,msg:"用户信息不存在"})
                                    return
                                }

                                res.status(200).send({errCode:0,data:user})
                            }
                        })                        
                    })
                }
            }else{
                res.send({errCode:3,msg:"验证码已过时,请重新获取"})
            }          
        }        
    })
})

// $router GET /api/users/captcha
// @desc 获取一次性图形验证码
// 返回请求json数据
// @access public
router.get('/captcha', function (req, res) {
    //console.log(req.session.captcha)
    let captcha = svgCaptcha.create({
        size: 4 ,// size of random string
        ignoreChars: '0o1i' ,// filter out some characters like 0o1i
        noise: 2 ,// number of noise lines
        color: true ,// characters will have distinct colors instead of grey, true if background option is set
        background: '#fff' ,// background color of the svg image
    }); 
    console.log("1111111111")   
    let captchaStr = captcha.text.toLowerCase(); // 图形验证码
    let captcha_id
    console.log("222222222222") 
    // 将生成的验证码存在数据库，把存储时的数据库id返回
    const captchaNew = new captchaCode( {captchaStr} )
    console.log("33333333333333") 
    captchaNew.save((error,captchaRet)=>{
        if(error){
            throw error
        }else{
            if(captchaRet){
                // 如果验证码在数据库中保存成功
                console.log("444444444444444444") 
                captcha_id = captchaRet._id.toString()
                console.log("555555555555555555") 
                console.log(typeof captcha_id)
                res.type('svg')   
                res.status(200).send({"captchaData":captcha.data,"captchaId":captcha_id}) 
                console.log("数据库保存验证码成功!")
            }else{
                res.send({errCode:1,msg:"获取验证码失败请重新获取"})
                return 
            }
        }
    }) 
});

// $router POST /api/users/register
// @desc 普通用户注册接口
// 返回请求json数据
// @access public
router.post("/register",(req,res)=>{
    // 普通用户登录或者注册接口,查询数据库如果存在客户信息则登录否则注册之后登录
    const userName = req.body.userName;
    const passWord = req.body.passWord
    const phoneNum = req.body.phoneNum 
    let registerFileds = {}    
    // 判断前台提交的用户名是否合法
    // 根据输入的用户名查询数据库中是否有相同的用户名存在
    registerFileds.userName = userName
    registerFileds.passWord = passWord
    registerFileds.phoneNum = phoneNum
    console.log("112223344455")
    console.log(userName)
    User.findOne({userName},(error,user)=>{
        if(error){
            throw error
        }else{
            if(user){
                // 根据用户名查询数据库中存在相同用户名(如果查询到说明数据中已存在用户名)
                console.log(user)
                res.send({errCode:1,msg:"该用户名已被注册!"})
                return                
            }else{
                // 数据中不存在相同的用户名,那么就开始注册插入数据库
                const userNew = new User(registerFileds)
                userNew.save((error,user)=>{
                    if(error){
                        throw error
                    }else{
                        if(user){
                            console.log("注册成功!")
                            req.session.userid = user._id
                            res.send({errCode:0,data:user})
                        }else{
                            res.send({errCode:1,msg:"保存用户信息失败!"})
                            return
                        }
                    }
                })
            }
        }
    })

})

// $router GET /api/users/check_name
// @desc 查询用户是否已经被注册get请求
// 返回请求json数据
// @access public
router.get("/check_name",(req,res)=>{
    // 获取请求参数数据
    let userName = req.query.userName  
    console.log(userName)
    User.findOne({userName},(error,user)=>{
        if(error){
            throw error
        }else{
            if(user){
                res.send({errCode:1,msg:"该用户名已被注册"})
                return
            }else{
                res.send({errCode:0,data:user})
            }
        }
    })
})


// $router GET /api/users/getuserInfo
// @desc 查询用户信息实现用户自动登录的功能 get请求
// 返回请求json数据
// @access public
router.get("/getuserInfo",(req,res)=>{
    // 获取请求参数数据
    let _id = req.query.user_id  
    // console.log('@@@@@@@@@@@@@@@@@@@@@@@')
    console.log(_id)
    if(_id){
        User.findOne({_id},(error,user)=>{
            if(error){
                throw error
            }else{
                console.log("##########################")
                if(user){
                    // 查询到用户信息
                    console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$")
                    res.send({errCode:0,data:user})
                }else{                
                    res.send({errCode:1,msg:"请先注册或者登录"})
                    return
                }
            }
        })
    }
})

/////////////////////////////////后台管理系统部分接口///////////////////////////////////////////

// $router POST /api/users/admin_register
// @desc 管理员用户注册接口
// 返回请求json数据
// @access public
router.post("/admin_register",(req,res)=>{
    // 把上送的字段解构出来
    let {name,password,email,identity} = req.body.registerUser1
    // console.log("11111111 = " + identity)
    let registerFileds = {}
    registerFileds.name = name
    registerFileds.password = password
    registerFileds.email = email
    registerFileds.identity = identity

    AdminUser.findOne({name},(error,user)=>{
        if(error){
            throw error
        }else{
            if(user){
                // 用户名存在
                res.send({errCode:1,msg:"该用户名已经注册"})
            }else{
                // 用户不存在,检查email注册是否存在
                AdminUser.findOne({email},(error,email)=>{
                    if(error){
                        throw error
                    }else{
                        if(email){
                            // 注册的email已存在
                            res.send({errCode:2,msg:"该邮箱已被注册"})
                        }else{
                            // 不再校验用户信息，开始插入数据库
                            let adminuser = new AdminUser(registerFileds)
                            adminuser.save((error,user)=>{
                                if(error){
                                    throw error
                                }else{
                                    if(user){
                                        // 插入数据库成功
                                        res.send({errCode:0,msg:"用户注册成功"})
                                    }else{
                                        res.send({errCode:3,msg:"用户注册失败"})
                                    }
                                }
                            })
                        }
                    }
                })
            }
        }
    })
})

// $router POST /api/users/admin_login
// @desc 管理员用户登录接口
// 返回请求json数据
// @access public
router.post("/admin_login",(req,res)=>{
    let {email,password} = req.body.loginUser1
    //let {email,password} = req.body
    //查询数据库
    AdminUser.findOne({email},(error,user)=>{
        if(error){
            throw error
        }else{
            if(user){
                //用户存在
                // 数据库中获取到用户信息,取出保存的密码
                if(user.password !== password){
                    res.status(400).send({errCode:2,msg:"密码错误"})
                    return
                }else{
                    // 密码校验成功
                    // jwt.sign("规则","加密的名字","过期时间( {expiresIn:3600} )","箭头函数")
                    const rule = {id:user._id,name:user.name,identity:user.identity} // 规则                     
                    jwt.sign(rule,keys.secretOrKey,{expiresIn:3600},(error,token)=>{
                        if(error){
                            throw error
                        }else{
                            if(token){
                                // 生成token成功,把生成的token返回
                                res.status(200).send({
                                    errCode:0,
                                    msg:"Token生成成功",
                                    token:"Bearer " + token
                                })
                            }else{
                                res.status(400).send({errCode:3,msg:"Token生成失败"})
                            }
                        }
                    })
                }
            }else{
                res.status(404).send({errCode:1,msg:"用户信息不存在"})
            }
        }
    })
})

// $router GET /api/users/current
// @desc 验证TOKEN
// 返回请求json数据
// @access private
router.get("/current",passport.authenticate("jwt",{session:false}),(req,res)=>{
    res.status(200).send({errCode:0,msg:"success",data:{
        id:req.user.id,
        name:req.user.name,
        email:req.user.email,
        password:req.user.password
    }})
})

// $router POST /api/users/admin_additem
// @desc 增加 文件提交数据
// 返回请求json数据
// @access private
router.post("/admin_additem",(req,res)=>{
    //获取表单的数据 以及post过来的图片    
    const BASEURL = "http://localhost:6000/upload/lunbo/"
    let form = new multiparty.Form();
    form.uploadDir='upload/lunbo'   //上传图片保存的地址 目录必须存在
    form.parse(req, (err, fields, files) => {
        //获取提交的数据以及图片上传成功返回的图片信息        
        // console.log("hhhhhhhh = " , fields);  /*获取表单的数据*/        
        // console.log("oooooo == ", files);  /*图片上传成功返回的信息*/
        let title = ""        
        let desc = ""        
        let pic = ""
        let item = {}
        if(fields){
            title = fields.title[0]   
            desc = fields.desc[0]           
            item.title = title
            item.desc = desc
        }

        if(files.pic){
            pic = files.pic[0].path;
            console.log("11111 = ",BASEURL + pic.slice(13))
            pic = BASEURL + pic.slice(13)
            item.pic = pic
        }        
        
        // 将上传的数据保存到数据库中
        let newItem  = new AddItem(item)
        newItem.save((error,item)=>{
            if(error){
                throw error
            }else{
                if(item){
                    // 数据保存成功
                    console.log("数据保存成功!")
                    res.send({errCode:0,msg:"数据保存成功",data:item})
                }else{
                    console.log("数据保存失败!")
                    res.send({errCode:1,msg:"数据保存失败"})
                    return 
                }
            }
        })        
    })
})

// $router GET /api/users/getitemdata
// @desc 获取数据库中保存的数据
// 返回请求json数据
// @access private
router.get("/getitemdata",passport.authenticate("jwt",{session:false}),(req,res)=>{
    AddItem.find((error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                // 查询到数据
                console.log("数据返回成功")
                res.status(200).send({errCode:0,msg:"数据返回成功",dataArr:data})
            }else{
                console.log("查询无返回数据")
               res.status(404).send({errCode:1,msg:"查询无返回数据"})
               return 
            }
        }
    })
})

// $router GET /api/users/get_lunbo_item
// @desc 获取数据库中保存的轮播图数据
// 返回请求json数据
// @access private
router.get("/get_lunbo_item",(req,res)=>{
    let id = req.query.id
    console.log("******* id = ",id)
    if(id){
        AddItem.findById({_id:id},(error,info)=>{
            if(error){
                throw error
            }else{
                if(info){
                    // 获取到服务器数据
                    console.log("数据查询成功( get_lunbo_item 获取数据库中保存的轮播图数据 )")
                    res.status(200).send({errCode:0,msg:"数据查询成功",data:info})
                }else{
                    // 数据返回为空
                    console.log("数据无返回记录 ( get_lunbo_item 获取数据库中保存的轮播图数据 )")
                    res.status(404).send({errCode:1,msg:"查询无返回记录"})
                    return
                }
            }
        })
    }    
})

// $router POST /api/users/admin_editItem
// @desc 编辑  文件提交数据
// 返回请求json数据
// @access private
router.post("/admin_editItem",(req,res)=>{
    //获取表单的数据 以及post过来的图片    
    const BASEURL = "http://localhost:6000/upload/lunbo/"
    let form = new multiparty.Form();
    form.uploadDir='upload/lunbo'   //上传图片保存的地址 目录必须存在
    form.parse(req, (err, fields, files) => {
        //获取提交的数据以及图片上传成功返回的图片信息        
        // console.log("hhhhhhhh = " , fields);  /*获取表单的数据*/        
        // console.log("oooooo == ", files);  /*图片上传成功返回的信息*/
        if(err){
            throw err
        }else{
            let title = ""        
            let desc = ""
            let _id = ""
            let pic = ""
            let item = {}
            if(fields){
                // console.log("***&&&&&*&****")
                title = fields.title[0];        
                desc = fields.desc[0];
                _id = fields._id[0]
                item.title = title
                item.desc = desc
            }

            if(files.pic){
                // console.log("&&&&&&&&768")
                pic = files.pic[0].path;
                console.log("11111 = ",BASEURL + pic.slice(13))
                pic = BASEURL + pic.slice(13)
                item.pic = pic
            }
            // console.log("%^%^%^%^%^ _id = ",_id)             

            AddItem.findOneAndUpdate({_id},{$set:item},{new:true},(error,data)=>{
                if(error){
                    throw error
                }else{
                    if(data){
                        console.log("数据更新成功")
                        res.status(200).send({errCode:0,msg:"数据更新成功",data:data})
                    }else{
                        console.log("数据更新失败")
                        res.send({errCode:1,msg:"数据更新失败"})
                        return
                    }
                }
            })
        }       
    })
})

// @route POST /api/users/admin_delItem
// @desc 删除 信息请求接口
// @access private
router.delete("/admin_delItem/:id",passport.authenticate("jwt",{session:false}),(req,res)=>{
    let _id = req.params.id  
    AddItem.findOneAndRemove({_id},(error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                console.log("删除数据成功")
                // 删除存在在本地文件夹中的数据
                console.log("///// =-",data)
                let fileName = data.pic.slice(21)
                fs.unlink("."+fileName,(error)=>{
                    if(error){
                        console.log("删除服务器本地文件失败")
                        res.send({errCode:2,msg:"删除服务器本地文件失败"})
                        return
                    }else{
                        console.log("删除服务器本地文件成功")
                        res.status(200).send({errCode:0,msg:"删除数据成功",data:data})
                    }
                })
                
            }else{
                res.send({errCode:1,msg:"删除数据失败"})
                return 
            }
        }
    })        
})


//////////////////////////////后台管理首页的美食推荐版块///////////////////////////////////
// $router POST /api/users/admin_addFooedRecItem
// @desc 增加 文件提交数据
// 返回请求json数据
// @access private
router.post("/admin_addFooedRecItem",(req,res)=>{
    //获取表单的数据 以及post过来的图片    
    const BASEURL = "http://localhost:6000/upload/FoodRec/"
    let form = new multiparty.Form();
    form.uploadDir='upload/FoodRec'   //上传图片保存的地址 目录必须存在
    form.parse(req, (err, fields, files) => {
        //获取提交的数据以及图片上传成功返回的图片信息        
        console.log("hhhhhhhh = " , fields);  /*获取表单的数据*/        
        // console.log("oooooo == ", files);  /*图片上传成功返回的信息*/
        let foodName = ""        
        let desc = ""        
        let pic = ""
        let item = {}
        if(fields){
            foodName = fields.foodName[0]   
            desc = fields.desc[0]           
            item.foodName = foodName
            item.desc = desc
        }

        if(files.pic){
            pic = files.pic[0].path;
            console.log("11111 = ",BASEURL + pic.slice(15))
            pic = BASEURL + pic.slice(15)
            item.pic = pic
        }        
        
        // 将上传的数据保存到数据库中
        let newFoodRec  = new FoodRec(item)
        newFoodRec.save((error,item)=>{
            if(error){
                throw error
            }else{
                if(item){
                    // 数据保存成功
                    console.log("数据保存成功!")
                    res.send({errCode:0,msg:"数据保存成功",data:item})
                }else{
                    console.log("数据保存失败!")
                    res.send({errCode:1,msg:"数据保存失败"})
                    return 
                }
            }
        })        
    })
})

// $router POST /api/users/admin_editFoodRec
// @desc 编辑  文件提交数据
// 返回请求json数据
// @access private
router.post("/admin_editFoodRec",(req,res)=>{
    //获取表单的数据 以及post过来的图片    
    const BASEURL = "http://localhost:6000/upload/FoodRec/"
    let form = new multiparty.Form();
    form.uploadDir='upload/FoodRec'   //上传图片保存的地址 目录必须存在
    form.parse(req, (err, fields, files) => {
        //获取提交的数据以及图片上传成功返回的图片信息        
        // console.log("hhhhhhhh = " , fields);  /*获取表单的数据*/        
        // console.log("oooooo == ", files);  /*图片上传成功返回的信息*/
        if(err){
            throw err
        }else{
            let foodName = ""        
            let desc = ""
            let _id = ""
            let pic = ""
            let item = {}
            if(fields){
                // console.log("***&&&&&*&****")
                foodName = fields.foodName[0];        
                desc = fields.desc[0];
                _id = fields._id[0]
                item.foodName = foodName
                item.desc = desc
            }

            if(files.pic){
                // console.log("&&&&&&&&768")
                pic = files.pic[0].path;
                console.log("11111 = ",BASEURL + pic.slice(15))
                pic = BASEURL + pic.slice(15)
                item.pic = pic
            }
            // console.log("%^%^%^%^%^ _id = ",_id)             

            FoodRec.findOneAndUpdate({_id},{$set:item},{new:true},(error,data)=>{
                if(error){
                    throw error
                }else{
                    if(data){
                        console.log("数据更新成功")
                        res.status(200).send({errCode:0,msg:"数据更新成功",data:data})
                    }else{
                        console.log("数据更新失败")
                        res.send({errCode:1,msg:"数据更新失败"})
                        return
                    }
                }
            })
        }       
    })
})

// $router GET /api/users/getFoodRecdata
// @desc 获取数据库中保存的数据
// 返回请求json数据
// @access private
router.get("/getFoodRecdata",passport.authenticate("jwt",{session:false}),(req,res)=>{
    FoodRec.find((error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                // 查询到数据
                console.log("数据返回成功")
                res.status(200).send({errCode:0,msg:"数据返回成功",dataArr:data})
            }else{
                console.log("查询无返回数据")
               res.status(404).send({errCode:1,msg:"查询无返回数据"})
               return 
            }
        }
    })
})

// 
// $router GET /api/users/getFoodRecInfo
// @desc 获取数据库中保存的食物推荐数据
// 返回请求json数据
// @access private
router.get("/getFoodRecInfo",(req,res)=>{
    let id = req.query.id
    console.log("******* id = ",id)
    if(id){
        FoodRec.findById({_id:id},(error,info)=>{
            if(error){
                throw error
            }else{
                if(info){
                    // 获取到服务器数据
                    console.log("数据查询成功( get_lunbo_item 获取数据库中保存的轮播图数据 )")
                    res.status(200).send({errCode:0,msg:"数据查询成功",data:info})
                }else{
                    // 数据返回为空
                    console.log("数据无返回记录 ( get_lunbo_item 获取数据库中保存的轮播图数据 )")
                    res.status(404).send({errCode:1,msg:"查询无返回记录"})
                    return
                }
            }
        })
    }    
})


// @route POST /api/users/admin_delFoodRec
// @desc 删除 信息请求接口
// @access private
router.delete("/admin_delFoodRec/:id",passport.authenticate("jwt",{session:false}),(req,res)=>{
    let _id = req.params.id  
    FoodRec.findOneAndRemove({_id},(error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                console.log("删除数据成功")
                // 删除存在在本地文件夹中的数据
                console.log("///// =-",data)
                let fileName = data.pic.slice(21)
                fs.unlink("."+fileName,(error)=>{
                    if(error){
                        console.log("删除服务器本地文件失败")
                        res.send({errCode:2,msg:"删除服务器本地文件失败"})
                        return
                    }else{
                        console.log("删除服务器本地文件成功")
                        res.status(200).send({errCode:0,msg:"删除数据成功",data:data})
                    }
                })
                
            }else{
                res.send({errCode:1,msg:"删除数据失败"})
                return 
            }
        }
    })        
})
//////////////////////////////后台管理首页的美食推荐版块///////////////////////////////////

//////////////////////////////后台管理首页的精品美食推荐版块///////////////////////////////////
// $router POST /api/users/admin_addJPFooedRecItem
// @desc 增加 文件提交数据
// 返回请求json数据
// @access private
router.post("/admin_addJPFooedRecItem",(req,res)=>{
    //获取表单的数据 以及post过来的图片    
    const BASEURL = "http://localhost:6000/upload/JPFoodRec/"
    let form = new multiparty.Form();
    form.uploadDir='upload/JPFoodRec'   //上传图片保存的地址 目录必须存在
    form.parse(req, (err, fields, files) => {
        //获取提交的数据以及图片上传成功返回的图片信息        
        console.log("hhhhhhhh = " , fields);  /*获取表单的数据*/        
        // console.log("oooooo == ", files);  /*图片上传成功返回的信息*/
        let foodName = ""        
        let desc = ""        
        let pic = ""
        let item = {}
        if(fields){
            foodName = fields.foodName[0]   
            desc = fields.desc[0]           
            item.foodName = foodName
            item.desc = desc
        }
        if(files.pic){
            pic = files.pic[0].path;
            console.log("11111 = ",BASEURL + pic.slice(17))
            pic = BASEURL + pic.slice(17)
            item.pic = pic
        } 
        // 将上传的数据保存到数据库中
        let newJPFoodRec  = new AddJPFoodRec(item)
        newJPFoodRec.save((error,item)=>{
            if(error){
                throw error
            }else{
                if(item){
                    // 数据保存成功
                    console.log("数据保存成功!")
                    res.send({errCode:0,msg:"数据保存成功",data:item})
                }else{
                    console.log("数据保存失败!")
                    res.send({errCode:1,msg:"数据保存失败"})
                    return 
                }
            }
        })        
    })
})

// $router POST /api/users/admin_editJPFoodRec
// @desc 编辑  文件提交数据
// 返回请求json数据
// @access private
router.post("/admin_editJPFoodRec",(req,res)=>{
    //获取表单的数据 以及post过来的图片    
    const BASEURL = "http://localhost:6000/upload/JPFoodRec/"
    let form = new multiparty.Form();
    form.uploadDir='upload/JPFoodRec'   //上传图片保存的地址 目录必须存在
    form.parse(req, (err, fields, files) => {
        //获取提交的数据以及图片上传成功返回的图片信息        
        // console.log("hhhhhhhh = " , fields);  /*获取表单的数据*/        
        // console.log("oooooo == ", files);  /*图片上传成功返回的信息*/
        if(err){
            throw err
        }else{
            let foodName = ""        
            let desc = ""
            let _id = ""
            let pic = ""
            let item = {}
            if(fields){
                // console.log("***&&&&&*&****")
                foodName = fields.foodName[0];        
                desc = fields.desc[0];
                _id = fields._id[0]
                item.foodName = foodName
                item.desc = desc
            }
            if(files.pic){
                // console.log("&&&&&&&&768")
                pic = files.pic[0].path;
                console.log("11111 = ",BASEURL + pic.slice(17))
                pic = BASEURL + pic.slice(17)
                item.pic = pic
            } 
            AddJPFoodRec.findOneAndUpdate({_id},{$set:item},{new:true},(error,data)=>{
                if(error){
                    throw error
                }else{
                    if(data){
                        console.log("数据更新成功")
                        res.status(200).send({errCode:0,msg:"数据更新成功",data:data})
                    }else{
                        console.log("数据更新失败")
                        res.send({errCode:1,msg:"数据更新失败"})
                        return
                    }
                }
            })
        }       
    })
})

// $router GET /api/users/getJPFoodRecdata
// @desc 获取数据库中保存的数据
// 返回请求json数据
// @access private
router.get("/getJPFoodRecdata",passport.authenticate("jwt",{session:false}),(req,res)=>{
    AddJPFoodRec.find((error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                // 查询到数据
                console.log("数据返回成功")
                res.status(200).send({errCode:0,msg:"数据返回成功",dataArr:data})
            }else{
                console.log("查询无返回数据")
               res.status(404).send({errCode:1,msg:"查询无返回数据"})
               return 
            }
        }
    })
})

// $router GET /api/users/getJPFoodRecInfo
// @desc 获取数据库中保存的食物推荐数据
// 返回请求json数据
// @access private
router.get("/getJPFoodRecInfo",(req,res)=>{
    let id = req.query.id
    console.log("******* id = ",id)
    if(id){
        AddJPFoodRec.findById({_id:id},(error,info)=>{
            if(error){
                throw error
            }else{
                if(info){
                    // 获取到服务器数据
                    console.log("数据查询成功( get_lunbo_item 获取数据库中保存的轮播图数据 )")
                    res.status(200).send({errCode:0,msg:"数据查询成功",data:info})
                }else{
                    // 数据返回为空
                    console.log("数据无返回记录 ( get_lunbo_item 获取数据库中保存的轮播图数据 )")
                    res.status(404).send({errCode:1,msg:"查询无返回记录"})
                    return
                }
            }
        })
    }    
})

// @route POST /api/users/admin_delJPFoodRec
// @desc 删除 信息请求接口
// @access private
router.delete("/admin_delJPFoodRec/:id",passport.authenticate("jwt",{session:false}),(req,res)=>{
    let _id = req.params.id  
    AddJPFoodRec.findOneAndRemove({_id},(error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                console.log("删除数据成功")
                // 删除存在在本地文件夹中的数据
                console.log("///// =-",data)
                let fileName = data.pic.slice(21)
                fs.unlink("."+fileName,(error)=>{
                    if(error){
                        console.log("删除服务器本地文件失败")
                        res.send({errCode:2,msg:"删除服务器本地文件失败"})
                        return
                    }else{
                        console.log("删除服务器本地文件成功")
                        res.status(200).send({errCode:0,msg:"删除数据成功",data:data})
                    }
                })
                
            }else{
                res.send({errCode:1,msg:"删除数据失败"})
                return 
            }
        }
    })        
})
//////////////////////////////后台管理首页的精品美食推荐版块///////////////////////////////////

//////////////////////////////后台管理首页的家常菜管理版块///////////////////////////////////
// $router POST /api/users/admin_addJCFoodItem
// @desc 增加 文件提交数据
// 返回请求json数据
// @access private
router.post("/admin_addJCFoodItem",(req,res)=>{
    //获取表单的数据 以及post过来的图片    
    const BASEURL = "http://localhost:6000/upload/JCFood/"
    let form = new multiparty.Form();
    form.uploadDir='upload/JCFood'   //上传图片保存的地址 目录必须存在
    form.parse(req, (err, fields, files) => {
        //获取提交的数据以及图片上传成功返回的图片信息        
        console.log("hhhhhhhh = " , fields);  /*获取表单的数据*/        
        // console.log("oooooo == ", files);  /*图片上传成功返回的信息*/
        let foodName = ""        
        let desc = ""        
        let pic = ""
        let price = ""
        let discount = ""
        let fee = ""
        let rate = "" 
        let order = ""
        let foodinfo = ""
        let item = {}
        if(fields){
            foodName = fields.foodName[0]   
            desc = fields.desc[0]
            price = fields.price[0] 
            discount = fields.discount[0] 
            fee = fields.fee[0] 
            rate = fields.rate[0] 
            order = fields.order[0] 
            foodinfo = fields.foodinfo[0] 
            item.foodName = foodName
            item.desc = desc
            item.price = price
            item.discount = discount
            item.fee = fee
            item.rate = rate
            item.order = order
            item.foodinfo = foodinfo
        }
        if(files.pic){
            pic = files.pic[0].path;
            console.log("11111 = ",BASEURL + pic.slice(14))
            pic = BASEURL + pic.slice(14)
            item.pic = pic
        } 
        // 将上传的数据保存到数据库中
        let newJCFood  = new JCFood(item)
        newJCFood.save((error,item)=>{
            if(error){
                throw error
            }else{
                if(item){
                    // 数据保存成功
                    console.log("数据保存成功!")
                    res.send({errCode:0,msg:"数据保存成功",data:item})
                }else{
                    console.log("数据保存失败!")
                    res.send({errCode:1,msg:"数据保存失败"})
                    return 
                }
            }
        })        
    })
})

// $router POST /api/users/admin_editJCFood
// @desc 编辑  文件提交数据
// 返回请求json数据
// @access private
router.post("/admin_editJCFood",(req,res)=>{
    //获取表单的数据 以及post过来的图片    
    const BASEURL = "http://localhost:6000/upload/JCFood/"
    let form = new multiparty.Form();
    form.uploadDir='upload/JCFood'   //上传图片保存的地址 目录必须存在
    form.parse(req, (err, fields, files) => {
        //获取提交的数据以及图片上传成功返回的图片信息        
        console.log("hhhhhhhh = " , fields);  /*获取表单的数据*/        
        console.log("oooooo == ", files);  /*图片上传成功返回的信息*/
        if(err){
            throw err
        }else{
            let foodName = ""        
            let desc = ""
            let _id = ""
            let pic = ""
            let price = ""
            let discount = ""
            let fee = ""
            let rate = "" 
            let order = ""
            let foodinfo = ""
            let item = {}
            if(fields){
                // console.log("***&&&&&*&****")
                foodName = fields.foodName[0];        
                desc = fields.desc[0];
                _id = fields._id[0]
                price = fields.price[0] 
                discount = fields.discount[0] 
                fee = fields.fee[0] 
                rate = fields.rate[0] 
                order = fields.order[0] 
                foodinfo = fields.foodinfo[0]
                
                item.foodName = foodName
                item.desc = desc
                item.price = price
                item.discount = discount
                item.fee = fee
                item.rate = rate
                item.order = order
                item.foodinfo = foodinfo
            }
            if(files.pic){
                // console.log("&&&&&&&&768")
                pic = files.pic[0].path;
                console.log("11111 = ",BASEURL + pic.slice(14))
                pic = BASEURL + pic.slice(14)
                item.pic = pic
            } 
            JCFood.findOneAndUpdate({_id},{$set:item},{new:true},(error,data)=>{
                if(error){
                    throw error
                }else{
                    if(data){
                        console.log("数据更新成功")
                        res.status(200).send({errCode:0,msg:"数据更新成功",data:data})
                    }else{
                        console.log("gougougougougou")
                        console.log("数据更新失败")
                        res.send({errCode:1,msg:"数据更新失败"})
                        return
                    }
                }
            })
        }       
    })
})

// $router GET /api/users/getJCFooddata
// @desc 获取数据库中保存的数据
// 返回请求json数据
// @access private
router.get("/getJCFooddata",passport.authenticate("jwt",{session:false}),(req,res)=>{
    JCFood.find((error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                // 查询到数据
                console.log("数据返回成功")
                res.status(200).send({errCode:0,msg:"数据返回成功",dataArr:data})
            }else{
                console.log("查询无返回数据")
               res.status(404).send({errCode:1,msg:"查询无返回数据"})
               return 
            }
        }
    })
})

// $router GET /api/users/getJCFoodInfo
// @desc 获取数据库中保存的食物推荐数据
// 返回请求json数据
// @access private
router.get("/getJCFoodInfo",(req,res)=>{
    let id = req.query.id
    console.log("******* id = ",id)
    if(id){
        JCFood.findById({_id:id},(error,info)=>{
            if(error){
                throw error
            }else{
                if(info){
                    // 获取到服务器数据
                    console.log("数据查询成功( get_lunbo_item 获取数据库中保存的轮播图数据 )")
                    res.status(200).send({errCode:0,msg:"数据查询成功",data:info})
                }else{
                    // 数据返回为空
                    console.log("数据无返回记录 ( get_lunbo_item 获取数据库中保存的轮播图数据 )")
                    res.status(404).send({errCode:1,msg:"查询无返回记录"})
                    return
                }
            }
        })
    }    
})

// @route POST /api/users/admin_delJCFood
// @desc 删除 信息请求接口
// @access private
router.delete("/admin_delJCFood/:id",passport.authenticate("jwt",{session:false}),(req,res)=>{
    let _id = req.params.id  
    JCFood.findOneAndRemove({_id},(error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                console.log("删除数据成功")
                // 删除存在在本地文件夹中的数据
                console.log("///// =-",data)
                let fileName = data.pic.slice(21)
                fs.unlink("."+fileName,(error)=>{
                    if(error){
                        console.log("删除服务器本地文件失败")
                        res.send({errCode:2,msg:"删除服务器本地文件失败"})
                        return
                    }else{
                        console.log("删除服务器本地文件成功")
                        res.status(200).send({errCode:0,msg:"删除数据成功",data:data})
                    }
                })
                
            }else{
                res.send({errCode:1,msg:"删除数据失败"})
                return 
            }
        }
    })        
})

//////////////////////////////后台管理首页的精品美食推荐版块///////////////////////////////////



////////////////////////////// 后台管理商品分类列表模块 ///////////////////////////////////

// $router POST /api/users/admin_addClassifyList
// @desc 增加 增加商品分类列表  提交数据
// 返回请求json数据
// @access private
router.post("/admin_addClassifyList",(req,res)=>{
    let {classifyNo,classifyName,classifyDesc} = req.body
    let dataObj = {}
    dataObj.classifyNo = classifyNo
    dataObj.classifyName = classifyName
    dataObj.classifyDesc = classifyDesc

    console.log(req.body)
    let newClassifyList = new ClassifyList(dataObj)
    newClassifyList.save((error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                res.status(200).send({errCode:0,msg:"分类列表保存数据库成功",data:data})
            }else{
                res.send({errCode:1,msg:"分类列表保存数据库失败"})
                return
            }
        }
    })
})

// $router GET /api/users/getClassifyListData
// @desc 获取数据库中保存的    食品分类    所有的数据
// 返回请求json数据
// @access private
router.get("/getClassifyListData",passport.authenticate("jwt",{session:false}),(req,res)=>{
    ClassifyList.find((error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                // 查询到数据
                console.log("数据返回成功")
                res.status(200).send({errCode:0,msg:"数据返回成功",dataArr:data})
            }else{
                console.log("查询无返回数据")
               res.status(404).send({errCode:1,msg:"查询无返回数据"})
               return 
            }
        }
    })
})


// $router POST /api/users/admin_editClassfyList
// @desc 编辑 保存的    食品分类    单条的数据
// 返回请求json数据
// @access private
router.post("/admin_editClassfyList",(req,res)=>{
    let {classifyNo,classifyName,classifyDesc,_id} = req.body
    let dataObj = {}
    dataObj.classifyNo = classifyNo
    dataObj.classifyName = classifyName
    dataObj.classifyDesc = classifyDesc 
    ClassifyList.findOneAndUpdate({_id},{$set:dataObj},{new:true},(error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                console.log("修改数据库分类信息成功")
                res.status(200).send({errCode:0,msg:"修改数据库分类信息成功",data:data})
            }else{
                console.log("修改数据库分类信息失败")
                res.send({errCode:1,msg:"修改数据库分类信息失败"})
                return 
            }
        }
    })
})

// $router GET /api/users/getClassifyListcInfo
// @desc 获取数据库中保存的食物推荐数据
// 返回请求json数据
// @access private
router.get("/getClassifyListInfo",(req,res)=>{
    let _id = req.query.id
    if(_id){
        ClassifyList.findById({_id},(error,info)=>{
            if(error){
                throw error
            }else{
                if(info){
                    // 获取到服务器数据                   
                    res.status(200).send({errCode:0,msg:"数据查询成功",data:info})
                }else{
                    // 数据返回为空
                    res.status(404).send({errCode:1,msg:"查询无返回记录"})
                    return
                }
            }
        })
    }    
})

// @route POST /api/users/admin_DelClassifyList
// @desc 删除 信息请求接口
// @access private
router.delete("/admin_DelClassifyList/:id",passport.authenticate("jwt",{session:false}),(req,res)=>{
    let _id = req.params.id  
    ClassifyList.findOneAndRemove({_id},(error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                console.log("删除数据成功")
                res.status(200).send({errCode:0,msg:"删除数据成功",data:data})                
            }else{
                res.send({errCode:1,msg:"删除数据失败"})
                return 
            }
        }
    })        
})
////////////////////////////// 后台管理 商品分类列表 模块 ///////////////////////////////////

////////////////////////////// 后台管理 商品分类 模块 ///////////////////////////////////
// $router POST /api/users/admin_addClassify
// @desc 增加 文件提交数据
// 返回请求json数据
// @access private
router.post("/admin_addClassify",(req,res)=>{
    //获取表单的数据 以及post过来的图片    
    const BASEURL = "http://localhost:6000/upload/Classify/"    //  JCFood 6  Classify 8
    let form = new multiparty.Form();
    form.uploadDir='upload/Classify'   //上传图片保存的地址 目录必须存在
    form.parse(req, (err, fields, files) => {
        //获取提交的数据以及图片上传成功返回的图片信息        
        console.log("hhhhhhhh = " , fields);  /*获取表单的数据*/        
        // console.log("oooooo == ", files);  /*图片上传成功返回的信息*/
        let ClassifyNo = ""
        let ClassifyName = ""
        let foodName = ""        
        let desc = ""        
        let pic = ""
        let price = ""
        let discount = ""
        let fee = ""
        let rate = "" 
        let order = ""
        let foodinfo = ""
        let item = {}
        if(fields){
            ClassifyNo = fields.ClassifyNo[0]  
            ClassifyName = fields.ClassifyName[0]  
            console.log("OOOOOOOO = ",ClassifyNo)
            console.log("VVVVVVVV = ",ClassifyName)
            foodName = fields.foodName[0]   
            desc = fields.desc[0]
            price = fields.price[0] 
            discount = fields.discount[0] 
            fee = fields.fee[0] 
            rate = fields.rate[0] 
            order = fields.order[0] 
            foodinfo = fields.foodinfo[0] 
            item.ClassifyNo = ClassifyNo
            item.foodName = foodName
            item.ClassifyName = ClassifyName
            item.desc = desc
            item.price = price
            item.discount = discount
            item.fee = fee
            item.rate = rate
            item.order = order
            item.foodinfo = foodinfo
        }
        if(files.pic){
            pic = files.pic[0].path;
            console.log("11111 = ",BASEURL + pic.slice(16))
            pic = BASEURL + pic.slice(16)
            item.pic = pic
        } 
        // 将上传的数据保存到数据库中
        let newClassify  = new Classify(item)
        newClassify.save((error,item)=>{
            if(error){
                throw error
            }else{
                if(item){
                    // 数据保存成功
                    console.log("数据保存成功!")
                    res.send({errCode:0,msg:"数据保存成功",data:item})
                }else{
                    console.log("数据保存失败!")
                    res.send({errCode:1,msg:"数据保存失败"})
                    return 
                }
            }
        })        
    })
})

// $router GET /api/users/getClassifyDataBase
// @desc 获取数据库中保存的    食品分类    所有的数据
// 返回请求json数据
// @access private
router.get("/getClassifyDataBase",passport.authenticate("jwt",{session:false}),(req,res)=>{
    Classify.find((error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                // 查询到数据
                console.log("数据返回成功")
                res.status(200).send({errCode:0,msg:"数据返回成功",dataArr:data})
            }else{
                console.log("查询无返回数据")
               res.status(404).send({errCode:1,msg:"查询无返回数据"})
               return 
            }
        }
    })
})

// $router POST /api/users/admin_editClassify
// @desc 编辑  商品分类
// 返回请求json数据
// @access private
router.post("/admin_editClassify",(req,res)=>{
    //获取表单的数据 以及post过来的图片    
    const BASEURL = "http://localhost:6000/upload/Classify/"
    let form = new multiparty.Form();
    form.uploadDir='upload/Classify'   //上传图片保存的地址 目录必须存在
    form.parse(req, (err, fields, files) => {
        //获取提交的数据以及图片上传成功返回的图片信息        
        console.log("hhhhhhhh = " , fields);  /*获取表单的数据*/        
        console.log("oooooo == ", files);  /*图片上传成功返回的信息*/
        if(err){
            throw err
        }else{
            let ClassifyNo = ""
            let ClassifyName = ""
            let foodName = ""        
            let desc = ""
            let _id = ""
            let pic = ""
            let price = ""
            let discount = ""
            let fee = ""
            let rate = "" 
            let order = ""
            let foodinfo = ""
            let item = {}
            if(fields){
                ClassifyNo = fields.ClassifyNo[0]  
                ClassifyName = fields.ClassifyName[0]  
                foodName = fields.foodName[0];        
                desc = fields.desc[0];
                _id = fields._id[0]
                price = fields.price[0] 
                discount = fields.discount[0] 
                fee = fields.fee[0] 
                rate = fields.rate[0] 
                order = fields.order[0] 
                foodinfo = fields.foodinfo[0]
                
                item.ClassifyNo = ClassifyNo
                item.ClassifyName = ClassifyName
                item.foodName = foodName
                item.desc = desc
                item.price = price
                item.discount = discount
                item.fee = fee
                item.rate = rate
                item.order = order
                item.foodinfo = foodinfo
            }
            if(files.pic){
                pic = files.pic[0].path;
                console.log("11111 = ",BASEURL + pic.slice(16))
                pic = BASEURL + pic.slice(16)
                item.pic = pic
            } 
            Classify.findOneAndUpdate({_id},{$set:item},{new:true},(error,data)=>{
                if(error){
                    throw error
                }else{
                    if(data){
                        console.log("数据更新成功")
                        res.status(200).send({errCode:0,msg:"数据更新成功",data:data})
                    }else{
                        console.log("gougougougougou")
                        console.log("数据更新失败")
                        res.send({errCode:1,msg:"数据更新失败"})
                        return
                    }
                }
            })
        }       
    })
})

// $router GET /api/users/getClassifyListcInfo
// @desc 获取数据库中保存的食物推荐数据
// 返回请求json数据
// @access private
router.get("/getClassifyInfo",(req,res)=>{
    let _id = req.query.id
    if(_id){
        Classify.findById({_id},(error,info)=>{
            if(error){
                throw error
            }else{
                if(info){
                    // 获取到服务器数据                   
                    res.status(200).send({errCode:0,msg:"数据查询成功",data:info})
                }else{
                    // 数据返回为空
                    res.status(404).send({errCode:1,msg:"查询无返回记录"})
                    return
                }
            }
        })
    }    
})

// @route POST /api/users/admin_DelClassify
// @desc 删除 信息请求接口
// @access private
router.delete("/admin_DelClassify/:id",passport.authenticate("jwt",{session:false}),(req,res)=>{
    let _id = req.params.id  
    Classify.findOneAndRemove({_id},(error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                console.log("删除数据成功")
                res.status(200).send({errCode:0,msg:"删除数据成功",data:data})                
            }else{
                res.send({errCode:1,msg:"删除数据失败"})
                return 
            }
        }
    })        
})

////////////////////////////// 后台管理 商品分类 模块 ///////////////////////////////////

//////////////////////////////客户端获取精美家常菜信息///////////////////////////////////
// $router GET /api/users/getJCFoodInfoDataBase
// @desc 获取数据库中保存的数据
// 返回请求json数据
// @access private
router.get("/getJCFoodInfoDataBase",(req,res)=>{
    JCFood.find((error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                // 查询到数据
                console.log("数据返回成功")
                res.status(200).send({errCode:0,msg:"数据返回成功",data:data})
            }else{
                console.log("查询无返回数据")
               res.status(404).send({errCode:1,msg:"查询无返回数据"})
               return 
            }
        }
    })
})
//////////////////////////////客户端获取精美家常菜信息///////////////////////////////////

//////////////////////////////客户端获取精美美食推荐信息///////////////////////////////////
// $router GET /api/users/getJCFoodInfoDataBase
// @desc 获取数据库中保存的数据
// 返回请求json数据
// @access private
router.get("/getJPFoodRecInfoData",(req,res)=>{
    AddJPFoodRec.find((error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                // 查询到数据
                console.log("数据返回成功")
                res.status(200).send({errCode:0,msg:"数据返回成功",data:data})
            }else{
                console.log("查询无返回数据")
               res.status(404).send({errCode:1,msg:"查询无返回数据"})
               return 
            }
        }
    })
})
//////////////////////////////客户端获取精美美食推荐信息///////////////////////////////////

//////////////////////////////购物车数据保存到数据库中///////////////////////////////////
// $router POST /api/users/saveCartDataToDataBase
// @desc 编辑  文件提交数据
// 返回请求json数据
// @access private
router.post("/saveCartDataToDataBase",(req,res)=>{
    let { foodName,number } = req.body.dataObj
    let item = {}
    item.number = number
    CartData.find({foodName},(error,data)=>{
        if(error){
            throw error
        }else{
            if(data.length){
                // 查找到数据存在,修改数据库中的数据
                CartData.findOneAndUpdate({foodName},{$set:item},{new:true},(error,data)=>{
                    if(error){
                        throw error
                    }else{
                        if(data){
                            res.send({errCode:0,msg:"购物车数据更新成功 _id",data:data})
                        }else{
                            res.send({errCode:1,msg:"购物车数据更新失败 _id"})
                        }
                    }
                })

            }else{
                // 查找到数据不存在
                let newcCartData = new CartData(req.body.dataObj)
                newcCartData.save((error,data)=>{
                    if(error){
                        throw error
                    }else{
                        if(data){
                            // 数据保存成功
                            res.status(200).send({errCode:0,msg:"购物车数据保存成功",data:data})
                        }else{
                            res.send({errCode:1,msg:"购物车数据保存失败"})
                            return
                        }
                    }
                })
            }
        }
    })
    
})
//////////////////////////////购物车数据保存到数据库中///////////////////////////////////

//////////////////////////////获取user_id的下购物车数据///////////////////////////////////
// $router GET /api/users/getJCFoodInfoDataBase
// @desc 获取数据库中保存的数据
// 返回请求json数据
// @access private
router.get("/getCartDataFromDataBase",(req,res)=>{
    let user_id = req.query.user_id
    // user_id = "5e339c5f9928960cf492b47a"
    console.log(user_id)
    CartData.find({user_id},(error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                // 数据库查询数据成功
                // 使用 user_id 过滤出查询的数据
                console.log(data)
                res.status(200).send({errCode:0,msg:"获取购物车数据成功",data:data})
            }else{
                // 数据库查询数据失败
                res.send({errCode:1,msg:"获取购物车数据失败"})
            }
        }
    })   
})
//////////////////////////////获取user_id的下购物车数据///////////////////////////////////

//////////////////////////////更新购物车中的数据///////////////////////////////////
// $router POST /api/users/updateCartData
// @desc 获取数据库中保存的数据
// 返回请求json数据
// @access private
router.post("/updateCartData",(req,res)=>{
    let {_id,choiceFlag,user_id,number} = req.body.updateObj
    let item = {}
    item.choiceFlag = choiceFlag
    if(number){
        item.number = number
    }
    
    // console.log(choiceFlag)
    // console.log(_id)
    if(_id){
        CartData.findOneAndUpdate({_id},{$set:item},{new:true},(error,data)=>{
            if(error){
                throw error
            }else{
                if(data){
                    res.send({errCode:0,msg:"购物车数据更新成功 _id",data:data})
                }else{
                    res.send({errCode:1,msg:"购物车数据更新失败 _id"})
                }
            }
        })
    }else{        
        /**
         * 
         updateMany 根据条件更新多条记录
        */
        CartData.updateMany({user_id},item,{safe:true,multi:true},(error,data)=>{
            if(error){
                throw error                
            }else{
                if(data){
                    res.status(200).send({errCode:0,msg:"批量更新数据库成功"})
                }else{
                    res.send({errCode:1,msg:"批量更新数据库失败"})
                }
            }
        })        
    }
})
//////////////////////////////客户端更新购物车中的数据///////////////////////////////////

//////////////////////////////客户端删除购物车中单条的数据///////////////////////////////////
// @route POST /api/users/delsignalCartData
// @desc 删除 信息请求接口
// @access private
router.delete("/delsignalCartData/:id",(req,res)=>{
    let _id = req.params.id 
    CartData.findOneAndRemove({_id},(error,data)=>{
        if(error){
            throw error
        }else{
            if(data){                
                console.log("成功删除购物车数据中的数据记录")
                res.status(200).send({errCode:0,msg:"删除数据成功",data:data})               
            }else{
                res.send({errCode:1,msg:"删除购物车数据中的数据记录失败"})
                return 
            }
        }
    })        
})

// @route POST /api/users/delAllCartData
// @desc 删除购物车数据中的所有数据记录
// @access private
router.delete("/delAllCartData/:user_id",(req,res)=>{
    let user_id = req.params.user_id 
    CartData.deleteMany({user_id},(error,data)=>{
        if(error){
            throw error
        }else{
            if(data){                
                console.log("成功删除购物车数据中的所有数据记录")
                res.status(200).send({errCode:0,msg:"删除所有数据成功",data:data})               
            }else{
                res.send({errCode:1,msg:"删除购物车数据中的所有数据记录失败"})
                return 
            }
        }
    })       
})

//////////////////////////////客户端删除购物车中单条的数据///////////////////////////////////

//////////////////////////////前端客户端保存数据数据库中///////////////////////////////////
// $router POST /api/users/saveAddressData
// @desc 增加 文件提交数据
// 返回请求json数据
// @access private
router.post("/saveAddressData",(req,res)=>{
    let dataObj = req.body.valueObj
    let isDefault = req.body.valueObj.isDefault
    let user_id = req.body.valueObj.user_id
    let item = {}
    if(isDefault){
        item = {}
        item.isDefault = false
        console.log("OOOOOOOOOOOO item = ",item)
        // 如果isDefault字段为true 设置其他记录的isDefault为false
        AddressAdmin.updateMany({user_id},item,{safe:true,multi:true},(error,data)=>{
            if(error){
                throw error                
            }else{
                if(data){
                    let newAddress = new AddressAdmin(dataObj)
                    newAddress.save((error,data)=>{
                        if(error){
                            throw error
                        }else{
                            if(data){
                                // 保存数据成功
                                res.status(200).send({errCode:0,msg:"地址信息保存成功",data:data})
                            }else{
                                res.send({errCode:1,msg:"地址信息保存失败"})
                                return 
                            }
                        }
                    })
                }else{
                    console.log("批量更新数据库失败")
                }
            }
        })
    }else{
        let newAddress = new AddressAdmin(dataObj)
        newAddress.save((error,data)=>{
            if(error){
                throw error
            }else{
                if(data){
                    // 保存数据成功
                    res.status(200).send({errCode:0,msg:"地址信息保存成功",data:data})
                }else{
                    res.send({errCode:1,msg:"地址信息保存失败"})
                    return 
                }
            }
        })
    }    
})
//////////////////////////////前端客户端保存数据数据库中///////////////////////////////////

//////////////////////////////获取user_id的地址信息数据///////////////////////////////////
// $router GET /api/users/getJCFoodInfoDataBase
// @desc 获取数据库中保存的数据
// 返回请求json数据
// @access private
router.get("/getAddressInfoFromDatabase",(req,res)=>{
    let user_id = req.query.user_id
    // user_id = "5e339c5f9928960cf492b47a"
    console.log(user_id)
    AddressAdmin.find({user_id},(error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                // 数据库查询数据成功
                // 使用 user_id 过滤出查询的数据
                console.log(data)
                res.status(200).send({errCode:0,msg:"获取地址数据成功",data:data})
            }else{
                // 数据库查询数据失败
                res.send({errCode:1,msg:"获取地址数据失败"})
            }
        }
    })   
})
//////////////////////////////获取user_id的下购物车数据///////////////////////////////////

//////////////////////////////客户端获取_id的地址信息数据///////////////////////////////////
// $router GET /api/users/getJCFoodInfoDataBase
// @desc 获取数据库中保存的数据
// 返回请求json数据
// @access private
router.get("/getEditAddressInfoById",(req,res)=>{
    let _id = req.query._id
    // user_id = "5e339c5f9928960cf492b47a"
    console.log(_id)
    AddressAdmin.find({_id},(error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                // 数据库查询数据成功
                // 使用 user_id 过滤出查询的数据
                console.log(data)
                res.status(200).send({errCode:0,msg:"获取编辑地址数据成功",data:data})
            }else{
                // 数据库查询数据失败
                res.send({errCode:1,msg:"获取编辑地址数据失败"})
            }
        }
    })   
})
//////////////////////////////获取user_id的下购物车数据///////////////////////////////////

//////////////////////////////前端客户端更新地址数据到数据库中///////////////////////////////////
// $router POST /api/users/saveAddressData
// @desc 增加 文件提交数据
// 返回请求json数据
// @access private
router.post("/updateAddressData",(req,res)=>{

    let dataObj = req.body.valueObj
    let _id = req.body.valueObj._id
    let user_id = req.body.valueObj.user_id
    let item = {}
    // 如果发现设置是否是默认地址的字段为true的时候其他有设置默认地址的的记录修改为false
    let isDefault = req.body.valueObj.isDefault
    if(isDefault){
        item = {}
        item.isDefault = false
        // 如果isDefault字段为true 设置其他记录的isDefault为false
        AddressAdmin.updateMany({user_id},item,{safe:true,multi:true},(error,data)=>{
            if(error){
                throw error                
            }else{
                if(data){
                    console.log("批量更新数据库成功")
                    AddressAdmin.findOneAndUpdate({_id},{$set:dataObj},{new:true},(error,data)=>{
                        if(error){
                            throw error
                        }else{
                            if(data){
                                console.log("修改地址数据保存数据库成功")
                                res.status(200).send({errCode:0,msg:"修改地址数据保存数据库成功",data:data})
                                
                            }else{
                                res.send({errCode:1,msg:"修改地址数据保存数据库失败"})
                            }
                        }
                    })
                }else{
                    console.log("批量更新数据库失败")
                }
            }
        })
    }
})

// @route POST /api/users/delsignalCartData
// @desc 删除 信息请求接口
// @access private
router.delete("/delAddressData/:id",(req,res)=>{
    let _id = req.params.id 
    AddressAdmin.findOneAndRemove({_id},(error,data)=>{
        if(error){
            throw error
        }else{
            if(data){                
                console.log("成功删除地址数据中的数据记录")
                res.status(200).send({errCode:0,msg:"删除数据成功",data:data})               
            }else{
                res.send({errCode:1,msg:"删除地址数据中的数据记录失败"})
                return 
            }
        }
    })        
})
//////////////////////////////前端客户端更新地址数据到数据库中///////////////////////////////////

//////////////////////////////客户端获取商品分类列表///////////////////////////////////
// $router GET /api/users/getJCFoodInfoDataBase
// @desc 客户端获取商品分类列表
// 返回请求json数据
// @access private
router.get("/getClassifyListsData",(req,res)=>{    
    ClassifyList.find((error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                // 数据库查询数据成功
                // 使用 user_id 过滤出查询的数据
                console.log(data)
                res.status(200).send({errCode:0,msg:"获取客户端获取商品分类列表成功",data:data})
            }else{
                // 数据库查询数据失败
                res.send({errCode:1,msg:"获取客户端获取商品分类列表失败"})
            }
        }
    })   
})


//////////////////////////////客户端获取商品分类列表///////////////////////////////////
// $router GET /api/users/getClassifyData
// @desc 获取数据库中保存的数据
// 返回请求json数据
// @access private
router.get("/getClassifyData",(req,res)=>{    
    Classify.find((error,data)=>{
        if(error){
            throw error
        }else{
            if(data){
                // 数据库查询数据成功
                // 使用 user_id 过滤出查询的数据
                console.log(data)
                res.status(200).send({errCode:0,msg:"获取客户端获取商品分类数据成功",data:data})
            }else{
                // 数据库查询数据失败
                res.send({errCode:1,msg:"获取客户端获取商品分类数据失败"})
            }
        }
    })   
})

//////////////////////////////客户端获取商品分类列表///////////////////////////////////
module.exports = router