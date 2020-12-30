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

Uses Node/Express, Passport.js with local authentication using sessions and MongoDB/Mongoose, and Vanilla JS, EJS templates. Database hosted by MongoDB/Atlas; uploaded photos are saved to Cloudinary cloud via API and a link saved to my database. Cloudinary was employed for data persistence (for photos) rather than having photos periodically vanish due to how Heroku works. Frontend presentation is loosely based on photo provided by Chingu.io for Flutter app. Feature specs also provided by Chingu. Pell Editor is used for WYSIWYG note entry

![Chingu design specs / mockup / starting point](https://github.com/chingu-voyages/soloproject-tier3-flutter-blogapp)

- Add-on packages include: <br>

  1. [Passport-local](https://www.npmjs.com/package/passport-local)
  2. [Passport](https://www.npmjs.com/package/passport)
  3. [Mongoose](https://www.npmjs.com/package/mongoose)
  4. [Connect-Mongo](https://www.npmjs.com/package/connect-mongo)
  5. [Multer](https://www.npmjs.com/package/multer)
  6. [Cloudinary](https://www.npmjs.com/package/cloudinary)
  7. [Dotenv](https://www.npmjs.com/package/dotenv)

- Includes Javascript code from: <br>

  1. [Pell](https://jaredreich.com/pell/)
  2. [JQuery](https://jquery.com/)
  3. [TextVersionJS](https://github.com/EDMdesigner/textversionjs)

- Front-end design uses: <br>
  1. [Bootstrap 4](https://getbootstrap.com)