// yes this is an express.js app
const express = require("express");
const mongoose = require("mongoose");
var passport = require("passport");
const session = require("express-session");
var crypto = require("crypto");
const { resolve } = require("path");
var LocalStrategy = require("passport-local").Strategy;
const MongoStore = require("connect-mongo")(session);
const textVersion = require("./static/js/textversion");

/* For multipart form processing */
const MongoClient = require("mongodb").MongoClient;
ObjectId = require("mongodb").ObjectId;
const multer = require("multer");
const fs = require("fs-extra");
const { title } = require("process");
const { rejects } = require("assert");
const { checkServerIdentity } = require("tls");
const { Server } = require("http");

// Access to the .env variables
require("dotenv").config();

//////////// TEST CLOUD
//console.log("from app.js cloudurl: " + cloud.testCloudinary());
////////////// TESTING CLOUD END
// CLOUDINARY CONFIG
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const port = process.env.PORT || process.argv[2] || 8080;
var app = express();

//////////////////////////////////////////////////////////////////////////////////// DB WORKING ON HERE
// DATABASE SETUP
//const conn = "mongodb://localhost:27017/dpfinster";
const ATLASURI = process.env.ATLASURI;
const connection = mongoose.createConnection(ATLASURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
connection.on("error", console.error.bind(console, "connection error: "));
connection.once("open", () => console.log("DB connected successfully"));

// MULTER STORAGE FOR PHOTOS
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now());
  },
});
var upload = multer({ storage: storage });

const UserSchema = new mongoose.Schema({
  username: String,
  fullname: String,
  hash: String,
  salt: String,
  createdAt: { type: Date, default: Date.now },
  admin: { type: Boolean, default: false },
  loginCount: { type: Number, default: 0 },
});

const User = connection.model("User", UserSchema);

// Schema for Articles
const ArticleSchema = new mongoose.Schema({
  title: String,
  subtitle: String,
  txt: String,
  link: String,
  createdAt: { type: Date, default: Date.now },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});
const Article = connection.model("Article", ArticleSchema);

// Setup index for text search//////////////////////////////////////////////// SEARCH
/*
var coll = conn.collection("articles");
coll.createIndex({});
*/

// using ejs for rendering
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

// using body parser to parse the body of incoming post requests
app.use(
  require("body-parser").urlencoded({
    extended: true, // must give a value for extended
  })
);

const locStr = new LocalStrategy(function verifyFunction(
  username,
  password,
  cb
) {
  User.findOne({ username: username })
    .then((user) => {
      if (!user) {
        return cb(null, false);
      }

      // Function defined at bottom?
      const isValid = validPassword(password, user.hash, user.salt);

      if (isValid) {
        return cb(null, user);
      } else {
        return cb(null, false);
      }
    })
    .catch((err) => {
      cb(err);
    });
});
passport.use(locStr);

passport.serializeUser(function (user, cb) {
  cb(null, user.id);
});
passport.deserializeUser(function (id, cb) {
  User.findById(id, function (err, user) {
    if (err) return cb(err);
    else cb(null, user);
  });
});

// SESSION SETUP
const sessionStore = new MongoStore({
  mongooseConnection: connection,
  collection: "sessions",
});

app.use(
  session({
    secret: "jkljkljkjiwejhohroihjfbja",
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: { maxAge: 1600000 },
  })
);
app.use(passport.initialize());
app.use(passport.session());

///////////////
// Middleware to protect uploads folder
app.use(function (req, res, next) {
  if (req.user == null && req.path.indexOf("/uploads") === 0) {
    res.redirect("/login");
    return;
  }
  next();
});
app.use("/uploads", express.static(__dirname + "/uploads"));

/////////////////// ROUTES/////////////////////
///////////////////////////////////////////
app.get("/", function (req, res) {
  res.render("index", {
    layout: "home",
    user: req.user,
  });
});

app.get(
  "/login",

  function (req, res) {
    res.render("index", {
      layout: "login",
      user: req.user,
    });
  }
);

app.post(
  "/login",
  passport.authenticate("local", {
    // redirect back to /login if login fails
    //successRedirect: "/dashboard", // WORK to DO HERE
    failureRedirect: "/login?loginFailed=true",
  }),

  // end up at / if login works
  function (req, res) {
    req.user.loginCount++;
    res.redirect("/"); // MORE WORK TO DO WITH ABOVE AND DASHBOARD
  }
);

app.get("/add_article2", function (req, res) {
  res.render("index", {
    layout: "add_article2",
    user: req.user,
  });
});

app.get("/add_article", function (req, res) {
  res.render("index", {
    layout: "add_article",
    user: req.user,
  });
});

// Middleware auth function for /posted route
// Runs BEFORE multer file upload to give authorization
function authMiddle(req, res, next) {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.log("error in authMiddle: " + err);
      return next(err);
    }
    if (!user) {
      console.log("authMiddle 334 !user");
      return res.redirect("login");
    }
    req.login(user, (err) => {
      let id = req.passport.user._id;
      console.log("authMiddle req.passport.user._id: " + id);
      if (err) {
        console.log("authMiddle 341 err: " + err);
        return next(err);
      }
      console.log("leaving authMiddle and calling next");
      return next();
    });
  });
}

app.get("/articlejs/:articleId", function (req, res, next) {
  if (!req.user) {
    res.redirect("/");
    return next();
  }
  const articleId = req.params.articleId;
  console.log("Entered route articlejs with articleId: " + articleId);

  (async function findArticleById() {
    const article = await Article.find({
      author: req.user._id,
      _id: articleId,
    });

    console.log(article);
    res.json(article);
  })();
});

app.get("/edit_article/:articleId", (req, res, next) => {
  if (!req.user) {
    res.redirect("/");
    return next();
  }
  console.log("Entered edit_article route. req.user.id is: " + req.user.id);

  const articleId = req.params.articleId;

  (async function findAndAttach() {
    const article = await Article.find({
      author: req.user._id,
      _id: articleId,
    });
    console.log("Retrieved article: " + article[0]);

    let createdAt = new Date(article[0].createdAt.toDateString());
    console.log(createdAt);
    let createdAt2 = createdAt.toString().split(" ").splice(0, 4).join(" ");
    console.log(createdAt2);

    res.render("index", {
      layout: "edit_article",
      user: req.user,
      article: article[0],
      createdAt: createdAt2,
      fullname: req.user.fullname,
    });
  })(); // end async function findAndAttach
});

// Get a single article by it's _id
// ex:  http://localhost:8081/article/5faa627798f74a9607e6aa34
app.get("/article/:articleId", function (req, res, next) {
  if (!req.user) {
    res.redirect("/");
    return next();
  }
  console.log("entered route article/:id");

  const articleId = req.params.articleId;

  console.log("req.user._id 258: " + req.user._id);
  console.log("259 articleId: " + articleId); // GOOD as string
  (async function findAndForward() {
    const article = await Article.find({
      author: req.user._id,
      _id: articleId,
    });

    console.log("article 296: " + article);
    console.dir(article);
    let createdAt = new Date(article[0].createdAt.toDateString());
    createdAt = createdAt.toString().split(" ").splice(0, 4).join(" ");

    console.log("createdAt 271: " + createdAt);
    //const createdAt = new Date(article.createdAt).toDateString();

    res.render("index", {
      layout: "article",
      user: req.user,
      article: article[0],
      createdAt: createdAt,
      fullname: req.user.fullname,
    });
  })();
});

app.get("/all_articles", function (req, res, next) {
  if (!req.user) {
    res.redirect("/");
    return next();
  }
  console.log("entered route all_articles");
  //console.log("all_articles req.user._id: " + req.user._id); //GOOD

  (async function findAndForward() {
    const articles = await Article.find({
      author: req.user._id,
    });

    const textStyle = {
      headingStyle: "hashify",
      uIndentationChar: " ",
      oIndentationChar: " ",
    };
    console.log("334:");
    console.dir(articles); // an array
    articles.forEach((curr) => {
      //curr.txt = stripHtmlEtc(curr.txt).slice(0, 50);

      let theText = textVersion(curr.txt, textStyle);
      if (theText.length > 200) {
        theText = theText.slice(0, 199) + "...(more)";
      }
      curr.txt = theText;
    });

    res.render("index", {
      layout: "all_articles",
      user: req.user,
      articles: articles,
      fullname: req.user.fullname,
      host: req.headers.host,
    });
  })();
});

app.get("/dashboard", function (req, res, next) {
  if (!req.user) {
    res.redirect("/");
    return next();
  }
  //console.log("entered route all_articles");
  console.log("dashboard req.user._id: " + req.user._id); //GOOD

  (async function findAndForward() {
    const articles = await Article.find({
      author: req.user._id,
    });

    //console.log("279:");
    //console.log(articles); // good

    res.render("index", {
      layout: "dashboard",
      user: req.user,
      articles: articles,
      fullname: req.user.fullname,
      host: req.headers.host,
    });
  })();
});
app.get("/posted", function (req, res) {
  res.redirect("/dashboard");
});

app.post("/posted", upload.single("photoupload"), function (req, res, next) {
  //let userid = req.session.passport.user;
  //console.log("/posted route req.session.passpot.user: " + req.user);
  let myPath2 = __dirname + "/" + req.file.path;
  console.log("In callback from upload.single");

  //console.log("req.user:" + req.user);
  console.log("typeof req.user._id: " + typeof req.user._id);
  console.log("req.user._id: " + req.user._id);
  // Do the cloudinary upload first and in callback, makeArticle
  cloudinary.uploader.upload(myPath2, {}, (err, myResult) => {
    if (err) {
      console.log("err in cloudinary 360:");
      console.dir(err);
    }
    console.log("Cloudinary image URL: " + myResult.url);

    let { title, subtitle, txt } = req.body;
    //let author = new ObjectId(userid._id);
    let author = req.user._id;
    console.log("336 user id in author temp var: " + author);

    let link = myResult.url;
    let fullname = req.user.fullname;

    (async function makeArticle() {
      const article = new Article({
        title,
        subtitle,
        txt,
        link,
        author,
      });

      const myResult1 = await article.save();
      let makeArtUrl =
        "http://" + req.headers.host + "/" + "article/" + article._id;
      console.log("Article created: " + makeArtUrl);

      ///////////////////////////////////////////
      const createdAt = new Date(article.createdAt).toDateString();

      res.render("index", {
        layout: "article",
        user: req.user,
        article: article,
        createdAt: createdAt,
        fullname: req.user.fullname,
        makeArtUrl: makeArtUrl,
        created: true,
      });
    })();
  }); // end cloudinary.uploader.upload
}); // end post to posted route

app.get("/register", function (req, res) {
  res.render("index", {
    layout: "register",
    user: req.user,
  });
});

app.post("/register", (req, res, next) => {
  const saltHash = genPassword(req.body.password);
  const salt = saltHash.salt;
  const hash = saltHash.hash;
  const newUser = new User({
    username: req.body.username,
    fullname: req.body.fullname,
    hash: hash,
    salt: salt,
  });
  newUser.save().then((user) => {
    console.log("saved user");
  });
  res.redirect("/login/?firstLogin=true");
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.use(express.static(__dirname + "/static"));

const server = app.listen(port, function () {
  console.log("passport-local demo up on port: " + port);
});

// HELPER FUNCTIONS

/**
 *
 * @param {*} password - The plain text password
 * @param {*} hash - The hash stored in the database
 * @param {*} salt - The salt stored in the database
 *
 * This function uses the crypto library to decrypt the hash using the salt and then compares
 * the decrypted hash/salt with the password that the user provided at login
 */
function validPassword(password, hash, salt) {
  var hashVerify = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return hash === hashVerify;
}
/**
 *
 * @param {*} password - The password string that the user inputs to the password field in the register form
 *
 * This function takes a plain text password and creates a salt and hash out of it.  Instead of storing the plaintext
 * password in the database, the salt and hash are stored for security
 *
 * ALTERNATIVE: It would also be acceptable to just use a hashing algorithm to make a hash of the plain text password.
 * You would then store the hashed password in the database and then re-hash it to verify later (similar to what we do here)
 */
function genPassword(password) {
  var salt = crypto.randomBytes(32).toString("hex");
  var genHash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");

  return {
    salt: salt,
    hash: genHash,
  };
}

/**********
 * This may come in handy - check restriction on file type of image
 */
function checkFileType(file, callback) {
  // Allowed extensions
  var fileTypes = /jpeg|jpg|png|gif/;
  // Check extention
  var extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  var mimeType = fileTypes.test(file.mimetype);

  if (mimeType && extname) {
    return callback(null, true);
  }
  callback(null, false);
}

// Handle SIGINT and SIGTERM to close connections
const quitSignals = ["SIGINT", "SIGTERM"];
quitSignals.forEach((signal) => process.on(signal, handleSignal));

function handleSignal(signal) {
  console.info(signal + " received...");
  server.close(() => {
    console.log("HTTP server closed.");
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed.");
      process.exit(0);
    });
  });
}

function stripHtmlEtc(str) {
  str = str.replace(/<br>/gi, "\n");
  str = str.replace(/<p.*>/gi, "\n");
  str = str.replace(/<a.*href="(.*?)".*>(.*?)<\/a>/gi, " $2 (Link->$1) ");
  str = str.replace(/<(?:.|\s)*?>/g, "");
  return str;
}
