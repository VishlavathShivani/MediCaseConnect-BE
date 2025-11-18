import express from 'express'
import { uploadReport, searchByQuery, searchByFile, getReports, deleteReportById } from '../controllers/reportController.js'
import { s3Upload, tempUpload }  from '../middleware/fileUploader.js'
//import auth from '../middleware/auth.js'
import { authenticateUser } from '../middleware/auth.js';

const reportRouter = express.Router();

// All report routes require authentication
reportRouter.use(authenticateUser);



reportRouter.post("/search/by-file", tempUpload.single('file'), searchByFile);

reportRouter.post("/search/by-query",  searchByQuery)


reportRouter.get("/", getReports)





export default reportRouter

