import express from "express"
import bcrypt from "bcrypt"
import mongoose from "mongoose"
import User from "../models/user.model.js"
import cloudinary from "../config/cloudinary.js"
import jwt from "jsonwebtoken"
import { checkAuth } from "../middleware/auth.middleware.js"
const router=express.Router()


router.post("/signup",async(req,res)=>{
try{
const hashedPassword =await bcrypt.hash(req.body.password,10)
const uploadImage=await cloudinary.uploader.upload(
    req.files.logoUrl.tempFilePath
)
console.log(uploadImage)
const newUser= new User({
    _id:new mongoose.Types.ObjectId,
    email:req.body.email,
    password:hashedPassword,
    channelName:req.body.channelName,
    phone:req.body.phone,
    logoUrl:uploadImage.secure_url,
    logoId:uploadImage.public_id
})

let user = await newUser.save()
res.status(201).json({
    user
})
}
catch(error){
    console.log(error)
    res.status(500).json({error:'something went wrong',message:error})

}

})

router.post('/signin',async(req,res)=>{

    try{
        const existingUser = await User.findOne({email:req.body.email})
        if(!existingUser){
            return res.status(404).json({message:"user not found"})
        }
        const isValid=await bcrypt.compare(
            req.body.password,
            existingUser.password
        )
        if(!isValid){
            return res.status(500).json({message:"Invalid credentials"})
        }
        const token=jwt.sign({
            _id:existingUser._id,
            channelName:existingUser.channelName,
            email:existingUser.email,
            logoId:existingUser.logoId,
        },process.env.JWT_TOKEN,{expiresIn:"10d"})
   
        res.status(200).json({
            _id:existingUser._id,
            channelName:existingUser.email,
            phone:existingUser.phone,
            logoId:existingUser.logoId,
            logoUrl:existingUser.logoUrl,
            token:token,
            subscribers:existingUser.subscribers,
            subscribedChannels:existingUser.subscribedChannels
        })
   
    }
    catch(error){
        console.log(error)
        res.status(500).json({error:'something went wrong',message:error.message})
    
    }
})

router.put("/update-profile",checkAuth,async(req,res)=>{
  try {
    const {channelName,phone}=req.body
    let updatedData={channelName,phone}

    if(req.files && req.files.logo){
        const uploadedImage=await cloudinary.uploader.upload(req.files.logo.tempFilePath)
        updatedData.logoUrl=uploadedImage.secure_url
        updatedData.logoId=uploadedImage.public_id
    }

    const updatedUser= await User.findByIdAndUpdate(req.user._id,updatedData,{new:true})

    res.status(200).json({message:"Profile updated succesfully",updatedUser})
  }
   catch(error){
    console.log(error)
    res.status(500).json({error:'something went wrong',message:error.message})

} 
})

router.post("/subscribe",checkAuth,async(req,res)=>{
    try {
        const{channelId}=req.body

        if(req.user._id==channelId){
            return res.status(400).json({error:"You can not subscribe to yourself"})
        }

        // Add the channel to user's subscribed channels
        await User.findByIdAndUpdate(req.user._id,{
            $addToSet:{subscribedChannels:channelId},
        })
         // Increment subscriber count
        await User.findByIdAndUpdate(channelId,{
            $inc:{subscribers:1},
        })

        res.status(200).json({message:"Subscribed Succesfully"})


    } catch(error){
    console.log(error)
    res.status(500).json({error:'something went wrong',message:error.message})

} 
})

export default router