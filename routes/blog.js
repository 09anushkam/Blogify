const {Router}=require("express");
const multer=require("multer");
const path=require("path");

const Blog=require("../models/blog");
const Comment=require("../models/comment");

// creating a router
const router=Router();

// creating diskStorage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null,path.resolve(`./public/uploads/`));
  },
  filename: function (req, file, cb) {
    const fileName=`${Date.now()} - ${file.originalname}`
    cb(null,fileName);
  }
});

const upload = multer({ storage: storage });

// renders add new blog
router.get('/add-new',(req,res)=>{
    return res.render('addBlog',{
        user:req.user, //required for nav data
    });
});

// renders particular blog
router.get('/:id',async(req,res)=>{
  const blog=await Blog.findById(req.params.id).populate('createdBy');
  const comments=await Comment.find({blogId:req.params.id}).populate(
    "createdBy"
  );
  // console.log('comments',comments);
  return res.render('blog',{
    user:req.user,
    blog,
    comments,
  });
});

// creating route for comments
router.post('/comment/:blogId',async(req,res)=>{
  await Comment.create({
    content:req.body.content,
    blogId:req.params.blogId,
    createdBy:req.user._id,
  });
  return res.redirect(`/blog/${req.params.blogId}`);
});

// submiting blog via post method
router.post('/',upload.single('coverImage'),async(req,res)=>{
    const {title,body}=req.body;
    const blog=await Blog.create({
        title,
        body,
        createdBy:req.user._id,
        coverImageURL:`/uploads/${req.file.filename}`
    })
    return res.redirect(`/blog/${blog._id}`); //redirect to /blog
});

module.exports=router;