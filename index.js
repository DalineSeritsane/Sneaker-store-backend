require("dotenv").config(); // Load env vars
const BASE_URL = process.env.BASE_URL;

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

app.use(express.json());
app.use(cors());

// Database connection with MongoDB
mongoose.connect('mongodb+srv://dalinelerato:dbSneaker@cluster0.ciddat4.mongodb.net/sneaker')
  .then(() => console.log("DB Connected"))
  .catch(err => console.log(err));

// API Creation
app.get("/", (req, res) => {
  res.send("Express App is Running");
});

// Image Storage Engine
const storage = multer.diskStorage({
  destination: './upload/images',
  filename: (req, file, cb) => {
    return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage });

// Image Upload Endpoint
app.use('/images', express.static('upload/images'));

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    console.log("No file received");
    return res.status(400).json({ success: 0, message: "No file uploaded" });
  }

  res.json({
    success: 1,
    image_url:  `${BASE_URL}/images/${req.file.filename}`
  });
});

// Schema for creating products
const Product = mongoose.model("Product", {
  id: { type: Number, required: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  available: { type: Boolean, default: true }
});

app.post('/addproduct', async (req, res) => {
  let products = await Product.find({});
  let id = products.length > 0 ? products[products.length - 1].id + 1 : 1;

  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    price: req.body.price
  });

  console.log(product);
  await product.save();
  console.log("Saved");

  res.json({
    success: true,
    name: req.body.name
  });
});

// Delete Product
app.post('/removeproduct', async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("Removed");
  res.json({
    success: true,
    name: req.body.name
  });
});

// Get All Products
app.get('/allproducts', async (req, res) => {
  let products = await Product.find({});
  console.log("All Products Fetched");
  res.send(products);
});

// Schema for User
const Users = mongoose.model('Users', {
  name: { type: String },
  email: { type: String, unique: true },
  password: { type: String },
  cartData: { type: Object },
  date: { type: Date, default: Date.now }
});

// Signup Endpoint
app.post('/signup', async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({ success: false, errors: "Existing Users found with same email address" });
  }

  let cart = {};
  for (let i = 0; i < 300; i++) cart[i] = 0;

  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart
  });

  await user.save();

  const data = { user: { id: user.id } };
  const token = jwt.sign(data, 'secret_ecom');
  res.json({ success: true, token });
});

// Login Endpoint
app.post('/login', async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = { user: { id: user.id } };
      const token = jwt.sign(data, 'secret_ecom');
      res.json({ success: true, token });
    } else {
      res.json({ success: false, errors: "Wrong password!" });
    }
  } else {
    res.json({ success: false, errors: "Wrong Email Id" });
  }
});

// New Collections Endpoint
app.get('/newcollections', async (req, res) => { // FIXED (removed extra space)
  let products = await Product.find({});
  let newcollection = products.slice(-8); // FIXED
  console.log("New Collections Fetched");
  res.send(newcollection);
});

// Popular in Puma Endpoint
app.get('/popularinpuma', async (req, res) => {
  let products = await Product.find({ category: "puma" }); // FIXED
  let popular_in_nike = products.slice(0, 4); // FIXED
  console.log("Popular in puma fetched");
  res.send(popular_in_nike);
});

// Middleware to Fetch User
const fetchUser = async (req, res, next) => { // FIXED
  const token = req.header('auth-token');
  if (!token) {
    return res.status(401).send({ errors: "Please authenticate using valid token" }); // FIXED: used 'errors' consistently
  }

  try {
    const data = jwt.verify(token, 'secret_ecom');
    req.user = data.user;
    next();
  } catch (error) {
    res.status(401).send({ errors: "Please authenticate using valid token" }); // FIXED
  }
};

// Add to Cart
app.post('/addtocart', fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
  res.send("Added");
});

// Remove from Cart
app.post('/removefromcart', fetchUser, async (req, res) => { // FIXED typo and syntax
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0) {
    userData.cartData[req.body.itemId] -= 1;
  }
  await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
  res.send("Removed");
});

//  creating endpoint to get cartdata 
app.post('/getcart', fetchUser, async (req,res)=>{
    console.log("Get Cart");
    let userData = await Users.findOne({_id:req.user.id})
    res.json(userData.cartData);
}) 

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});