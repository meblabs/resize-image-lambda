const AWS = require("aws-sdk");
const sharp = require("sharp");

const s3 = new AWS.S3();

const resize = async (origimage, width, height, destKey) => {
  try {
    const buffer = await sharp(origimage.Body).resize(width, height).toBuffer();
    const destparams = {
      ACL: "public-read",
      Bucket: process.env.destBucket,
      Key: destKey,
      Body: buffer,
      ContentType: "image",
    };

    return s3
      .putObject(destparams)
      .promise()
      .then(() => console.log(`Successfully resized: ${destKey}`));
  } catch (error) {
    console.log(error);
    return;
  }
};

exports.handler = async (event, context, callback) => {
  const { name: srcBucket } = event.Records[0].s3.bucket;
  const srcKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );
  console.log(srcKey); // full path [/images/original/users/key.ext]
  const typeMatch = srcKey.match(/\.([^.]*)$/);
  const assetType = srcKey.split("/")[2];
  const fileName = srcKey.split("/").pop();

  if (!typeMatch) {
    console.log("Could not determine the image type.");
    return;
  }

  const supportedTypes = ["jpg", "jpeg", "png"];

  const imageType = typeMatch[1].toLowerCase();
  if (!supportedTypes.includes(imageType)) {
    console.log(`Unsupported image type: ${imageType}`);
    return;
  }

  const paramsGet = {
    Bucket: srcBucket,
    Key: srcKey,
  };
  const origimage = await s3.getObject(paramsGet).promise();

  switch (assetType) {
    case "users":
      return resize(origimage, 500, 500, `images/users/${fileName}`);
    case "companies":
      return resize(origimage, 500, 500, `images/companies/${fileName}`);
    case "specsThumb":
      return Promise.all([
        resize(origimage, 400, 400, `images/specs/square/${fileName}`),
        resize(origimage, 1920, 1080, `images/specs/fullhd/${fileName}`),
      ]);
    case "specsShopDrawing":
      return resize(
        origimage,
        1280,
        720,
        `images/specs/shopDrawings/${fileName}`
      );
    case "specsDesignerDrawing":
      return resize(
        origimage,
        1280,
        720,
        `images/specs/designerDrawings/${fileName}`
      );
    case "specsGallery":
      return resize(origimage, 1920, 1080, `images/specs/gallery/${fileName}`);
    case "projects":
      return Promise.all([
        resize(origimage, 1920, 1080, `images/projects/fullhd/${fileName}`),
        resize(origimage, 1080, 1080, `images/projects/square/${fileName}`),
      ]);
    default:
      console.log(`Asset not valid: ${assetType}`);
      return;
  }
};
