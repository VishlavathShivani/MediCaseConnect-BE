import express from "express";
import { s3UploadDeptLogo, s3Upload }  from '../middleware/fileUploader.js'
import { uploadReport, deleteReportById } from "../controllers/reportController.js";
import { deleteUserById, getAllUsers, updateUserById, addUser } from "../controllers/userController.js";
import { getAllDepartments, addDepartment, updateDepartmentByCode, deleteDepartmentByCode, getAllBranches} from "../controllers/deptController.js";
import { getDashboardData } from "../controllers/dashboardController.js";
//import auth from "../middleware/auth.js";
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const adminRouter = express.Router();

// All admin routes require authentication AND admin role
adminRouter.use(authenticateUser);
adminRouter.use(requireAdmin);


// Report Management Routes
adminRouter.post("/reports/upload", s3Upload.single('file'), uploadReport);
adminRouter.delete("/reports/:id", deleteReportById)


// User Management Routes
adminRouter.get('/users', getAllUsers)
adminRouter.post('/users', addUser) 
adminRouter.put('/users/:id', updateUserById)
adminRouter.delete('/users/:id', deleteUserById)

// Department Management Routes
adminRouter.get('/departments', getAllDepartments)
adminRouter.post('/departments', s3UploadDeptLogo.single('file'), addDepartment)
adminRouter.put('/departments/:code', s3UploadDeptLogo.single('file'), updateDepartmentByCode)
adminRouter.delete('/departments/:code', deleteDepartmentByCode)

// Dashboard Route
adminRouter.get('/dashboard', getDashboardData)

// Branch Management Routes
adminRouter.get('/branches', getAllBranches)

// adminRouter.post("/login", adminLogin)
// adminRouter.get("/comments", auth, getAllComments)
// adminRouter.get("/blogs",auth, getAllBlogsAdmin)
// adminRouter.post("/delete-comment",auth, deleteCommentById)
// adminRouter.post("/approve-comment",auth, approveCommentById)
// adminRouter.get("/dashboard",auth, getDashboard)






export default adminRouter;