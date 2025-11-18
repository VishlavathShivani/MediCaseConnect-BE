import multer from 'multer';
import multerS3 from 'multer-s3';
import s3 from '../configs/awsS3.js';


const fileFilterReport = (req, file, cb) => {
  const allowedTypes = ['application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF allowed.'));
  }
};

const fileFilterDeptLogo = (req, file, cb) => {
    // Allow only image files for logos
    const allowedImageTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png'
    ];
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images (JPEG, JPG, PNG) allowed for department logos.'));
    }
  };

const autoFileNameGeneratorReport = (req, file, cb) => {
  // You can get these from req.body, query params, or decoded token
  const { branchCode, deptCode, clinicianId } = req.body;
  
  console.log('=== BACKEND RECEIVED REQUEST ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('File:', file);
  console.log('===========================');


  if (!branchCode || !deptCode || !clinicianId) {
      // Use callback to return error instead of throwing
      return cb(new Error("Missing required parameters: branchCode, deptCode, and clinicianId are required"));
    }

  const timestamp = Date.now();
  const extension = file.originalname.split('.').pop();
  
  return `reports/${branchCode}_${deptCode}_${clinicianId}_${timestamp}.${extension}`;

};

const autoFileNameGeneratorDeptLogo = (req, file, cb) => {
  
  const  code = req.body.code || req.params.code;

  if (!code) {
    return cb(new Error("Missing department code for file naming"));
  }
  const extension = file.originalname.split('.').pop();

  return `dept-logos/${code}_LOGO.${extension}`;
};


const s3Upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
       
        const filename = autoFileNameGeneratorReport(req, file, cb);
        file.uploadedFileName = filename;
        cb(null, filename);

    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: fileFilterReport
});

const s3UploadDeptLogo = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    acl: 'public-read',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const filename = autoFileNameGeneratorDeptLogo(req, file, cb);
        file.uploadedFileName = filename;
        cb(null, filename);

    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: fileFilterDeptLogo
});

const tempUpload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
    fileFilter: fileFilterReport
});



export { s3Upload, tempUpload, s3UploadDeptLogo };

