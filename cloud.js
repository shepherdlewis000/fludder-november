// const { resolveInclude } = require("ejs");

// Access to the .env variables
require("dotenv").config();

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
/*
function getCloudUrl(filepath) {
  cloudinary.uploader.upload(filepath, (err, res) => {
    console.log("cloudinary err: " + err);
    console.log("cloudinary res: " + res);
    console.dir(res);
    return res.url;
  });
}
*/
async function getCloudUrl(filepath) {
  return new Promise((res, rej) => {
    cloudinary.uploader.upload(filepath, (err, url) => {
      if (err) return reject(err);
      else return url;
    });
  });
}

const testPath = __dirname + "/testfile.png";

async function testCloudinary() {
  const testPath = __dirname + "/uploads/testfile.png";
  const url = await getCloudUrl(testPath);
  console.log("url: " + url);
}

module.exports = { getCloudUrl, testCloudinary };

// function upload(file, options, callback)

/* 
cloudinary.v2.uploader.upload('/home/myimage.jpg',
function(err, res){ console.log(err, res)});
*/

/* By default, synchronous upload. 
Upload call returns hash with content like this:
{ 
  public_id: 'cr4mxeqx5zb8rlakpfkg',
  version: 1571218330,
  signature: '63bfbca643baa9c86b7d2921d776628ac83a1b6e',
  width: 864,
  height: 576,
  format: 'jpg',
  resource_type: 'image',
  created_at: '2017-06-26T19:46:03Z',
  bytes: 120253,
  type: 'upload',
  url: 'http://res.cloudinary.com/demo/image/upload/v1571218330/cr4mxeqx5zb8rlakpfkg.jpg',
  secure_url: 'https://res.cloudinary.com/demo/image/upload/v1571218330/cr4mxeqx5zb8rlakpfkg.jpg' 
}
*/
