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

// CLOUDINARY CONFIG
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const port = process.env.PORT || process.argv[2] || 8080;
var app = express();

// DATABASE SETUP
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
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    store: sessionStore,
    cookie: { maxAge: 16000000, sameSite: true },
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

app.post("/login", function doLogin(req, res, next) {
  passport.authenticate("local", function (err, user, info) {
    if (err) {
      console.log("216 Error authenticating: " + err);
      return next(err);
    }
    if (!user) {
      console.log("Login failed");
      // Removed "return" before res.redirect - urlParam wasn't triggering alert when it was there
      return res.redirect("/login/?failedLoginAlert=true");
    }
    req.logIn(user, async function (err) {
      if (err) {
        console.log("225 Error logging in");
        // Below was printing stack trace after Error: Failed to serialize user into session
        //return next(err);
        // below was an UnhandledPromiseRejectionWarning: Error [ERR_HTTP_HEADERS_SENT]
        // Cannot set headers after they are sent to client - can't redirect here?
        // res.redirect("/login/?failedLoginAlert=true");
        return res.redirect("/login/?failedLoginAlert=true"); 
      }
      else{
        req.user.loginCount = req.user.loginCount + 1;
        let result = await req.user.save();

        console.log(
          "230 req.user.loginCount after increment: " + req.user.loginCount
        );
        // Successful log in // PARAM FOR LOGINCOUNT WASN"T WORKING HERE.
        // Possible to add a urlParam to welcome user
        return res.redirect(`/dashboard/?welcomeUser=true`);
      } // end else
    });
  })(req, res, next);
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

// edit_article/:articleId is route for edit of article
// Initial load of editable article. uses edit_pell2 layout
// edit_article (without articleId) processes deletes and saves.
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

    let createdAt = new Date(article[0].createdAt.toDateString());
    console.log(createdAt);
    let createdAt2 = createdAt.toString().split(" ").splice(0, 4).join(" ");
    console.log(createdAt2);

    res.render("index", {
      layout: "edit_pell2",
      user: req.user,
      article: article[0],
      createdAt: createdAt2,
      fullname: req.user.fullname,
    });
  })(); // end async function findAndAttach
});

// Get a single article by it's _id
app.get("/article/:articleId", function (req, res, next) {
  if (!req.user) {
    res.redirect("/");
    return next();
  }
  console.log("entered route article/:id " + req.params.articleId);

  const articleId = req.params.articleId;

  (async function findAndForward() {
    console.log("327 entered findAndForward");

    const article = await Article.find(
      {
        author: req.user._id,
        _id: articleId,
      },
      (err) => {
        if (err) {
          console.log("Couldn't find article error line 373.");
          // inside async function it's possible return res.redirect is good
          res.redirect("/dashboard/?articleNotFound=true");
          return next();
        }
      }
    );

    let createdAt = new Date(article[0].createdAt.toDateString());
    createdAt = createdAt.toString().split(" ").splice(0, 4).join(" ");

    res.render("index", {
      layout: "article",
      user: req.user,
      article: article[0],
      createdAt: createdAt,
      fullname: req.user.fullname,
    });
  })();
});

//////////////////////////////////// MAJOR WORK TO DO HERE

app.get("/all_articles", function (req, res, next) {
  if (!req.user) {
    res.redirect("/");
    return next();
  }
  console.log("entered route all_articles");

  (async function findAndForward() {
    const articles = await Article.find({
      author: req.user._id,
    });

    const textStyle = {
      headingStyle: "hashify",
      uIndentationChar: " ",
      oIndentationChar: " ",
    };

    // console.dir(articles); // an array
    articles.forEach((curr) => {


      ////////////////////////////////////////////////////////////// textVersion
      /* Trying to replace like dashboard.ejs
      let theText = textVersion(curr.txt, textStyle);
      if (theText.length > 200) {
        let myUrl = '/article' + curr._id;
        theText = theText.slice(0, 199) + `...<a href=${myUrl} class="badge badge-primary">more</a>`;
      }
      */
      let theText = htmlToPlainText(curr.txt, textStyle);
      if(theText.length > 200){
        theText = theText.slice(0, 199) + "...(more)";
      }
      
        theText = theText + ` <a href=${myUrl} class="badge badge-primary">full article</a>`;
      
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

  (async function findAndForward() {
    const articles = await Article.find({
      author: req.user._id,
    });

    res.render("index", {
      layout: "dashboard",
      user: req.user,
      articles: articles,
      fullname: req.user.fullname,
      host: req.headers.host,
    });
  })();
});
// only POST requests allowed to posted route)
app.get("/posted", function (req, res) {
  res.redirect("/dashboard");
});

app.post("/edit_article/:articleId", (req, res, next) => {
  if (!req.user) {
    res.redirect("/");
    return next();
  }

  const articleId = req.params.articleId;
  const { title, subtitle, txt, deleteArticle } = req.body;

  (async function updateArticle() {
    // Make sure doc actually exists
    const doc = await Article.findOne({ _id: articleId });

    console.log("430 entered updateArticle route with articleId: " + articleId);
    console.log("431 deleteArticle is: " + deleteArticle);

    //const deleteArticle = req.params.deleteArticle;

    if (doc && deleteArticle === "true") {
      console.log("entered if 430");
      await Article.deleteOne({ _id: articleId }, function (err) {
        if (err) {
          console.log("error deleting article");
          // removed "return" before res.redirect
          res.redirect("/dashboard?deleteFailed=true"); // set alert of failure
        }
        else{
          // Removing "return"
          //return res.redirect("/dashboard?deleteSuccess=true");
          res.redirect("/dashboard?deleteSuccess=true");
        }
      });
    } // end if deleteArticle
    else {
      // Shouldn't get here if deleting
      doc.title = title;
      doc.subtitle = subtitle;
      doc.txt = txt.trim();

      const myResult1 = await doc.save();
      let makeArtUrl =
        "http://" + req.headers.host + "/" + "article/" + articleId;
      console.log("Article updated: " + makeArtUrl);

      ///////////////////////////////////////////
      const createdAt = new Date(doc.createdAt).toDateString();

      // trouble here.. was trying to just reuse article route
      makeArtUrl = makeArtUrl + "/?articleCreated=true";
      res.redirect(makeArtUrl);
    }
  })();
  console.log("Exiting route edit_article");
});

app.post("/posted", upload.single("photoupload"), function (req, res, next) {
  let myPath2 = __dirname + "/" + req.file.path;

  console.log("posted route entered");

  // If user isn't logged in, redirect them to login page
  if(req.user == null || req.user._id == null){
    // here we return res.redirect (rather than using else below). 
    // Without return (just having res.redirect) (or an else) this route will keep running
    return res.redirect("/login?loginFirstAlert=true");
  }

  // Do the cloudinary upload first and in callback, makeArticle
  cloudinary.uploader.upload(myPath2, {}, (err, myResult) => {
    if (err) {
      console.log("err in cloudinary 360:");
      console.dir(err);
    }
    console.log("Cloudinary image URL: " + myResult.url);

    let { title, subtitle, txt} = req.body;
    let author = req.user._id;
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
      makeArtUrl = makeArtUrl + "/?created=true";
      res.redirect(makeArtUrl);

      ///////////////////////////////////////////
      const createdAt = new Date(article.createdAt).toDateString();
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
  res.redirect("/login/?firstLoginAlert=true");
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/login/?loggedOutAlert=true");
});

app.use(express.static(__dirname + "/static"));

const server = app.listen(port, function () {
  console.log("passport-local demo up on port: " + port);
});

// Gracefully exit on SIGINT
process.on('SIGTERM', () => {
  server.close(() => {
    console.log("SIGINT rec'd. Process terminated")
  })
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
