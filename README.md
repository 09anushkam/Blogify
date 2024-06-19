# Blogify  

## Setting up Blogging App  

- npm init  
- npm i express  
- npm i nodemon -D  
- npm i ejs  
- npm i mongoose  

- crypto hash nodejs - creatHmac  
models -> user.js -  

      // created salt for password hashing  
      // crypto hash nodejs - createHmac  
      // when u save these details it generate a salt  
      userSchema.pre('save',function(next){  
          const user=this;  

          if(!user.isModified('password')) return;  

          const salt=randomBytes(16).toString();  
          const hashedPassword=createHmac("sha256",salt).update(user.password).digest("hex");  

          this.salt=salt;  
          this.password=hashedPassword;  

          next();  
      });  

- mongoose virtual function - userSchema.static("",function)  
models -> user.js -  

      // mongoose virtual function  
      userSchema.static('matchPassword',async function(email,password){  
          const user=await this.findOne({email});  

          if(!user) throw new Error("User not found!");  

          const salt=user.salt;  
          const hashedPassword=user.password;  

          const userProvidedHash=createHmac("sha256",salt).update(password).digest("hex");  

          if(hashedPassword!==userProvidedHash) throw new Error("Incorrect Password!");  

          return user;  
      });  

- index.js -> imported - path,mongoose,express,userRoute  
created express app,  
connected to mongodb,  
setting ejs view engine,  
middleware required for post,  
on / render home,  
added user route,  
app.listen(PORT,`Server started at PORT: ${PORT}`),  

- views -> home,signup,signin ( partials(kindoff component) -> head, nav, scripts )  
- models -> user.js -> schema , password hashing using salt  
- routes -> user.js -> get('/signup'), get('/signin'), post('/signin'), post('/signup')  

## Adding Authentication to blogging App  

- npm i jsonwebtoken  
- npm i cookie-parser

- creating services/authentication.js -  

      const JWT=require("jsonwebtoken");
      const secret="$Superman@123";

      function createTokenForUser(user){
          const payload={
              _id:user._id,
              email:user.email,
              profileImageURL:user.profileImageURL,
              role:user.role,
          };
          const token=JWT.sign(payload,secret);
          return token;
      }

      function validateToken(token){
          const payload=JWT.verify(token,secret);
          return payload;
      }

      module.exports={createTokenForUser,validateToken};

- modified virtual function -> modes/user.js -  

      const {createTokenForUser}=require("../services/authentication");

      userSchema.static('matchPasswordAndGenerateToken',async function(email,password){
          const user=await this.findOne({email});

          if(!user) throw new Error("User not found!");

          const salt=user.salt;
          const hashedPassword=user.password;

          const userProvidedHash=createHmac("sha256",salt).update(password).digest("hex");

          if(hashedPassword!==userProvidedHash) throw new Error("Incorrect Password!");

          const token=createTokenForUser(user); //modified part
          return token;
      });

<!-- index.js -> user route,middlewares,blog route 
views -> home,signup,signin,addBlog ( partials -> head, nav, scripts )  
models -> user.js -> schema , password hashing using salt
models -> blog.js -> schema 
routes -> user routes created, blog routes created, -->

- routes -> user.js -> post('/signin') - (some changes are made)

          const token=await User.matchPasswordAndGenerateToken(email,password); //returns token  
          return res.cookie("token",token).redirect("/"); // returns cookie with token in it  

          // also to handle wrong password or email error try catch is added  
          router.post('/signin',async(req,res)=>{
          const {email,password}= req.body;
          try{
              const token=await User.matchPasswordAndGenerateToken(email,password); //returns token
              return res.cookie("token",token).redirect("/"); // returns cookie with token in it  
          }catch(error){
              return res.render("signin",{
                  error:"Incorrect Email or Password",
              });
          }
      });

- views ->  partials -> head -> error - added (for incorrect email and password)  

note - render() takes page name and not path where as redirect takes path  

- middlewares -> authentication.js created -  

      const { validateToken } = require("../services/authentication");

      // Checking authentication cookie
      function checkForAuthenticationCookie(cookieName){
          return (req,res,next)=>{
              const tokenCookieValue=req.cookies[cookieName];
              if(!tokenCookieValue){
                return next();
              }
              try{
                  const userPayload=validateToken(tokenCookieValue);
                  req.user=userPayload;
              }catch(error){}
              return next();
          }
      }

      module.exports={
          checkForAuthenticationCookie,
      }

- index.js (added middlewares and ) -

      const cookieParser=require("cookie-parser");
      const { checkForAuthenticationCookie } = require("./middlewares/authentication");

      // middlewares
      app.use(express.urlencoded({extended:false}));
      app.use(cookieParser());
      app.use(checkForAuthenticationCookie('token'));

      // homepage - some changes are made here
      app.get('/',(req,res)=>{
          res.render("home",{
          user:req.user, //required for nav data
          });
      });

- views ->  nav links edited and added some conditionals  

- routes/user.js (logout route added) -

      // logout  
      router.get('/logout',(req,res)=>{  
          res.clearCookie("token").redirect("/");  
      });  
      //also changes are made in nav link as per requirement  

- model -> blog.js created  
blogSchema and Blog model created  

- view -> addBlog.ejs created  

- routes -> blog.js created -

      const {Router}=require("express");
      const Blog=require("../models/blog");

      // creating a router
      const router=Router();

      // renders add new blog
      router.get('/add-new',(req,res)=>{
          return res.render('addBlog',{
              user:req.user, //required for nav data
          });
      });

- index.js -> blogRoute added

      const blogRoute=require("./routes/blog");
      app.use("/blog",blogRoute);

- views -> partials -> nav.ejs added /blog/add-new route in nav link  

- views -> addBlog.ejs -> form edited  

- routes/blog.js post method added  

      // submiting blog via post method
      router.post('/',(req,res)=>{
          console.log(req.body);
          return res.redirect("/"); //redirect to /blog
      });

- npm i multer  

- in routes/blog.js  

      // multer is imported and diskStorage is created for uploading cover image of blog  
      const multer=require("multer");
      const path=require("path");

      // creating diskStorage
      const storage = multer.diskStorage({
        destination: function (req, file, cb) {
          cb(null,path.resolve('./public/uploads/'));
        },
        filename: function (req, file, cb) {
          const fileName=`${Date.now()} - ${file.originalname}`
          cb(null,fileName);
        }
      });

      const upload = multer({ storage: storage });

      // submiting blog via post method
      router.post('/',upload.single('coverImage'),async(req,res)=>{
          const {title,body}=req.body;
          const blog=await Blog.create({
              title,
              body,
              createdBy:req.user._id,
            coverImageURL:`/uploads/${req.file.filename}`
          });
          return res.redirect(`/blog/${blog._id}`); //redirect to /blog
      });

Note don't forget to add `enctype="multipart/form-data"` in form in addBlog.ejs  

- index.js - rendering blogs card on homepage  

      const Blog=require("../models/blog");

      // homepage
      app.get('/',async(req,res)=>{
        const allBlogs=await Blog.find({}).sort('createdAt',-1);
          res.render("home",{
              user:req.user, //required for nav data
              blogs:allBlogs,
          });
      });

- views/home.ejs card of blogs are added in foreach loop  

- index.js - added a middleware to tell express that it can serve public folder as static one

      app.use(express.static(path.resolve('./public'))); //serve whatever is inside the public statically

- home.ejs -  
changes made in path view button of blogs  

## Remaining part of Blogging App  

- created a dynamic route in blog.js -

      // renders particular blog
      router.get('/:id',async(req,res)=>{
        const blog=await Blog.findById(req.params.id);
        return res.render('blog',{
          user:req.user,
          blog,
        });
      });

- view -> blog.ejs -> creating blog.ejs to render a particular blog  

- models -> comment.js - created comments model  

- route -> blog.js -> creating route for comments and editing rendering particular blog route

      // creating route for comments
      router.post('/comment/:blogId',async(req,res)=>{
        await Comment.create({
          content:req.body.content,
          blogId:req.params.blogId,
          createdBy:req.user._id,
        });
        return res.redirect(`/blog/${req.params.blogId}`);
      });
      // renders particular blog
      router.get('/:id',async(req,res)=>{
        const blog=await Blog.findById(req.params.id).populate('createdBy');
        const comments=await Comment.find({blogId:req.params.id}).populate(
          "createdBy"
        );
        console.log('comments',comments);
        return res.render('blog',{
          user:req.user,
          blog,
          comments,
        });
      });

- views -> blog.ejs -> handling add comments part

- till now  
we can signup  
signin  
logout  
submit a blog  
adding comments

- self learning topics -  
// handling admin part  
// edit/delete  
// issue - Anushka Murade (hard coded) in navbar <!-- Name should be dynamic in navbar -->  
// user profile image upload is not handled  

## Deploying Blog App  

- for deployment purpose use env variable  
-> index.js -  

            const PORT=process.env.PORT||8000;  

- connecting to mongodb using mongoose  

            mongoose  
            .connect(process.env.MONGO_URL)    //'mongodb://localhost:27017/blogify'  
            .then((e)=>console.log("MongoDB Connected!"));  

- make sure inside of package.json u have proper start script cloud providers uses start script  

            "scripts": {  
                "start": "node app.js",  
                "dev": "nodemon app.js"  
            },  

- rename index.js -> app.js  

- accordingly make changes in package.json  

  "main": "app.js",  
  "scripts": {  
    "start": "node app.js",  
    "dev": "nodemon app.js"  
  },  

- create .env file  
.env -  

- npm i dovenv  

- app.js  
at the top import dotenv  

            require('dotenv').config();

- amazon web services  
make free acc  
select region mumbai to reduce the latency  
search for beanstalk in the website  

<!-- 9:43 -->
