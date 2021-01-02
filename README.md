# "Fludder" Notes App

## Overview

This app was created as solo project / prep work for a Tier-3 Chingu.io team programming cohort. It allows a user to register/login then save notes which include text content and a photograph. Notes can later be searched and viewed.

#### LIVE LINK : https://frozen-journey-64327.herokuapp.com/

## Features

- Users can create an app account (e.g. username & password) for themselves (does not require an actual working email - no confirmation is sent)

- Registered users may login to the app.

- Logged in users may post new notes (including a photo, title, subtitle and rich-text content) to a collection of notes.

- Logged in users may modify or delete their previously entered notes.

- Logged in users may search text content of any of their previously saved notes.

## Technical description of implementation

Uses Node/Express, Passport.js with local authentication using sessions and MongoDB/Mongoose, and Vanilla JS, EJS templates. Database hosted by MongoDB/Atlas; uploaded photos are saved to Cloudinary cloud via API for data persistence rather than having photos periodically vanish due to Heroku ephemerality. Frontend presentation and features are loosely based on [photos & specifications provided by Chingu.io](https://github.com/chingu-voyages/soloproject-tier3-flutter-blogapp). Pell Editor is used for rich-text WYSIWYG note entry.


- Add-on packages include: <br>

  1. [Passport-local](https://www.npmjs.com/package/passport-local)
  2. [Passport](https://www.npmjs.com/package/passport)
  3. [Mongoose](https://www.npmjs.com/package/mongoose)
  4. [Connect-Mongo](https://www.npmjs.com/package/connect-mongo)
  5. [Multer](https://www.npmjs.com/package/multer)
  6. [Cloudinary](https://www.npmjs.com/package/cloudinary)
  7. [Dotenv](https://www.npmjs.com/package/dotenv)

- Includes Javascript from: <br>

  1. [Pell](https://jaredreich.com/pell/)
  2. [JQuery](https://jquery.com/)
  3. [TextVersionJS](https://github.com/EDMdesigner/textversionjs)

- Front-end design uses: <br>
  1. [Bootstrap 4](https://getbootstrap.com)

<br>

## To install and run: <br>
  1. **Clone this repository**: git clone https://github.com/shepherdlewis000/fludder-november.git <br>

  2. **Set the environment variables**: in a file named .env set the following variables that the app will use (See [dotenv](https://www.npmjs.com/package/dotenv) for the format the .env file should have & further info.)
    **i. ATLASURI** - You must have an [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account (free tier is fine as of 1/1/2021). Saved notes & user data will be stored here. The necessary environment variable can be found under your cluster listing by clicking "CONNECT",  then "Connect your application using MongoDB's native drivers" to obtain a connection string (e.g. mongodb+srv://db_user:<password>@cluster0.lP324.mongodb.net/<dbname>?retryWrites=true&w=majority). Replace \<password> with the password for the db_user user and replace \<dbname> with the name of the database that connections will use by default. Ensure any option params are URL encoded. 
    **ii. CLOUDINARY_API_KEY** - You also must have a [Cloudinary](https://cloudinary.com/) account (free tier is fine as of 1/1/2021). Photos will be uploaded here and referenced by the app as necessary. On Cloudinary login, you can find the necessary environment variable under "API Key" (e.g. 854661343574501)
    **iii. CLOUDINARY_API_SECRET** - On login at Cloudinary you can find the necessary environment variable under "API Secret" (e.g. 0207lZlxfYREOt6nAnE4-7TVLiJ)
    **iv. CLOUDINARY_NAME** - On login at Cloudinary you can find the necessary environment variable under "Cloud Name" (it's your Cloudinary username).
    **v. CLOUDINARY_URL** - At Cloudinary you can find the necessary environment variable under "API Environment variable" (e.g. CLOUDINARY_URL=cloudinary://644661384454313:0207lZlxfYREOt6nAnE4-7TVLiJ@your_username)
    **vi. SESSION_SECRET** - This is a random string you must provide to be used by the app to sign the session ID cookie. See [express-session](https://www.npmjs.com/package/express-session) for more details.
  3. **Run the app** - node app.js