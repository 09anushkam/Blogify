const path=require("path");
const express=require("express");
const mongoose=require("mongoose");
const cookieParser=require("cookie-parser");

const Blog=require("./models/blog");

const userRoute=require("./routes/user");
const blogRoute=require("./routes/blog");
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

// creating express app
const app=express();
const PORT=8000;

// connecting to mongodb using mongoose
mongoose
.connect('mongodb://localhost:27017/blogify')
.then((e)=>console.log("MongoDB Connected!"));

// setting ejs view engine
app.set("view engine",'ejs');
app.set("views",path.resolve("./views"));

// middlewares
app.use(express.urlencoded({extended:false})); //required for post
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token"));
app.use(express.static(path.resolve('./public'))); //serve whatever is inside the public statically

// homepage
app.get('/',async(req,res)=>{
    const allBlogs=await Blog.find({});
    res.render("home",{
        user:req.user, //required for nav data
        blogs:allBlogs,
    });
}); 

//user routes - rendering pages using get and sending data via post method in signup,signin
app.use("/user",userRoute); 
// blog routes - rendering add new blog page
app.use("/blog",blogRoute);

app.listen(PORT,()=>console.log(`Server started at PORT:${PORT}`));

