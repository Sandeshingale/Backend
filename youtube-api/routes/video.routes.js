import express from "express"
import mongoose from "mongoose"

import User from "../models/user.model.js"
import videoModel from "../models/video.models.js"
import cloudinary from "../config/cloudinary.js"
import { checkAuth } from "../middleware/auth.middleware.js"
import Video from "../models/video.models.js"

const router = express.Router()


router.post("/upload", checkAuth, async (req, res) => {
    try {
      const { title, description, category, tags } = req.body;
      if (!req.files || !req.files.video || !req.files.thumbnail) {
        return res.status(400).json({ error: "Video and thumbnail are required" });
      }
  
      // Upload Video to Cloudinary
      const videoUpload = await cloudinary.uploader.upload(req.files.video.tempFilePath, {
        resource_type: "video",
        folder: "videos",
      });
  
      // Upload Thumbnail to Cloudinary
      const thumbnailUpload = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath, {
        folder: "thumbnails",
      });
  
      // Create Video Document
      const newVideo = new Video({
        _id: new mongoose.Types.ObjectId(),
        title,
        description,
        user_id: req.user._id,
        videoUrl: videoUpload.secure_url,
        videoId: videoUpload.public_id,
        thumbnmailUrl: thumbnailUpload.secure_url,
        thumbnmailId: thumbnailUpload.public_id,
        category,
        tags: tags ? tags.split(",") : [],
      });
  
      await newVideo.save();
      res.status(201).json({ message: "Video uploaded successfully", video: newVideo });
    } catch (error) {
      console.error("Upload Error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });
    //update video (No Video Change, Only Metadata & Thumbnail)

    router.put("/update/:id",checkAuth , async(req,res)=>{
        try {
            const {title,description,category,tags}=req.body
            const videoId=req.params._id

            //find Video
            let video = await Video.findById(`video/${videoId}`)
            if(!video)return res.status(404).json({error:"Video not Found"})

            //Only owner can update
            if(video.user_id.toString ()!= req.user._id.toString()){
                return res.status(403).json({error:"Unauthorised"})
            }
            if(req.files && req.files.thumbnail){
                await cloudinary.uploader.destroy(video.thumbnailId);//delete old thumbnail
           
                const thumbnailUpload=await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath,{
                    folder:"thumbnails",
                })
                video.thumbnailUrl = thumbnailUpload.secure_url;
                video.thumbnailId = thumbnailUpload.public_id;
       
            }
            video.title = title || video.title;
            video.description = description || video.description;
            video.category = category || video.category;
            video.tags = tags ? tags.split(",") : video.tags;
          
            await video.save();
            res.status(200).json({ message: "Video updated successfully", video });
        } catch (error) {
            console.error("Update Error:", error);
            res.status(500).json({ message: "Something went wrong" });
        }   
    })

    router.delete("/delete/id",checkAuth,async(req,res)=>{

        try {
            const videoId = req.params.id;

            let video = await Video.findById(`video/${videoId}`);
            if (!video) return res.status(404).json({ error: "Video not found" });
        
            if (video.user_id.toString() !== req.user._id.toString()) {
              return res.status(403).json({ error: "Unauthorized" });
            }
            //delete from cloudinary
            await cloudinary.uploader.destroy(video.videoId, { resource_type: "video" });
            await cloudinary.uploader.destroy(video.thumbnailId);

            await Video.findByIdAndDelete(videoId)
            res.status(200).json({message:"Video Deleted Successfully"})

        } catch (error) {
            console.error("Update Error:", error);
            res.status(500).json({ message: "Something went wrong" });
        } 
    })

    //get all videos
    router.get("/all",async(req,res)=>{
        try{
            const videos= await Video.find().sort({created:-1})
            res.status(200).json(videos)
        } catch (error) {
            console.error("Fetch Error:", error);
            res.status(500).json({ message: "Something went wrong" });
          }
    })


    //get own videos
    router.get("/my-videos", checkAuth, async (req, res) => {
        try {
          const videos = await Video.find({ user_id: req.user._id }).sort({ createdAt: -1 });
          res.status(200).json(videos);
        } catch (error) {
          console.error("Fetch Error:", error);
          res.status(500).json({ message: "Something went wrong" });
        }
      });
      // 🔹 Get Videos by Category
    router.get("/category/:category", async (req, res) => {
    try {
      const videos = await Video.find({ category: req.params.category }).sort({ createdAt: -1 });
      res.status(200).json(videos);
    } catch (error) {
      console.error("Fetch Error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

        // 🔹 Get Videos by Tags
    router.get("/tags/:tag", async (req, res) => {
    try {
      const tag = req.params.tag;
      const videos = await Video.find({ tags: tag }).sort({ createdAt: -1 });
      res.status(200).json(videos);
    } catch (error) {
      console.error("Fetch Error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

      //like video
      router.post("/like",checkAuth,async(req,res)=>{
        try {
                const {videoId}=req.body

            await Video.findByIdAndUpdate(videoId,{
                $addToSet:{likes:req.user._id},
                $pull:{dislikes:req.user_id}, //remove from dislikes if previously disliked
            })
            res.status(200).json({message:"Liked the video"})


        } catch (error) {
            console.error("Fetch Error:", error);
            res.status(500).json({ message: "Something went wrong" });  
        }
      })
      router.post("/dislike",checkAuth,async(req,res)=>{
        try {
                const {videoId}=req.body

            await Video.findByIdAndUpdate(videoId,{
                $addToSet:{dislikes:req.user._id},
                $pull:{likes:req.user_id}, //remove from likes if previously liked
            })
            res.status(200).json({message:"Disliked the video"})


        } catch (error) {
            console.error("Fetch Error:", error);
            res.status(500).json({ message: "Something went wrong" });  
        }
      })

export default router