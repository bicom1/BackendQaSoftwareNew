const AsyncHandler = require('express-async-handler');
const User = require('../models/usermodel')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')

const registerUser = AsyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    const checkUser = await User.findOne({email})
    if (checkUser) {
        res.status(400)
        throw new Error('Email already exists')
    }

    if (!name || !email || !password || !role) {
        res.status(400);
        throw new Error('Please fill in all fields');
    }

    try {
       const salt = await bcrypt.genSalt(10);
       const hashedPass = await bcrypt.hash(password, salt);
        const createUser = await User.create({ name, email, password:hashedPass, role });

        res.json({
            _id: createUser._id,
            name: createUser.name,
            email: createUser.email,
            passsword: createUser.password,
            role: createUser.role,
            token: generateToken(createUser._id)

        })
    } catch (error) {
        res.status(500);
        throw new Error('User registration failed'); 
    }
});


const loginUser = AsyncHandler(async(req,res)=>{
    const {email,password}=req.body;

    if(!email ||!password){
        res.status(400);
        throw new Error('Please fill in all fields');
    }

    const findUser = await User.findOne({email});
    if(!findUser){
        res.status(404);
        throw new Error('User not found');
    }
    
    const passwordMatch = await bcrypt.compare(password,findUser.password);
    if(!passwordMatch){
        res.status(401);
        throw new Error('Invalid password');
    }else{
        res.json({
            _id: findUser._id,
            name: findUser.name,
            email: findUser.email,
            passsword: findUser.password,
            role: findUser.role,
            token: generateToken(findUser._id)

        })
    }
    
});


const findMyProfile = AsyncHandler(async(req,res)=>{
    const user_id = req.params.id;
    const foundUser = await User.findById({_id: user_id});
    if(!foundUser){
        res.status(404);
        throw new Error('User not found');
    }else{
        res.send(foundUser);
    }
})


const generateToken = (id)=>{
    return jwt.sign({id}, process.env.JWT_SECRET,{
        expiresIn: '1d',
    } )
}







module.exports={
    registerUser, loginUser, findMyProfile
}