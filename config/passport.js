const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt
const mongoose = require("mongoose")
const AdminUser = mongoose.model("admin_users_clients")
const keys = require("./keys")


var opts = {}
opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
opts.secretOrKey = keys.secretOrKey;

module.exports = (passport) => {
    passport.use(new JwtStrategy(opts, (jwt_payload, done) => {
        // console.log(jwt_payload) // jwt_payload 解析出token中的信息 
        // { id: '5e40e76f7489c712fc861ab8',
        // name: 'huweiu',
        // iat: 1581325644,
        // exp: 1581329244 }

        AdminUser.findById(jwt_payload.id,(error,user)=>{
            if(error){
                throw error
            }else{
                if(user){
                    // 查询到用户信息
                    return done(null,user)
                }else{
                    return done(null,false)
                }
            }
        })
    }));
}