// import jwt from "jsonwebtoken"

// const auth = (req, res, next)=>{
//     const token = req.headers.authorization
//     try{
//         jwt.verify(token, process.env.JWT_SECRET)
//         next()

//     }catch( error){
//         res.json({success: false, message: "Invalid Token"})
//     }
// }

// export default auth



import { verifyToken } from "@clerk/backend";
import { clerkClient } from "@clerk/clerk-sdk-node";

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing or malformed",
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // ✅ Verify token using Clerk backend package
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY, // must be your secret key (starts with sk_)
    });


    const userId = payload.sub; // Clerk puts user ID in the `sub` field
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid token: missing userId",
      });
    }

    // ✅ Fetch user details (optional but recommended)
    const user = await clerkClient.users.getUser(userId);
    console.log("Authenticated User:", user.emailAddresses[0]?.emailAddress);

    // Attach user info to request
    req.userId = userId;
    req.userEmail = user.emailAddresses[0]?.emailAddress;
    req.userRole = user.publicMetadata?.role || "clinician"; // fallback role

    next();
  } catch (error) {
    console.error("Auth error:", error);

    // Handle common Clerk token issues
    if (error.message?.includes("expired")) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// ✅ Simple admin-only route protection
export const requireAdmin = (req, res, next) => {
  if (req.userRole !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }
  next();
};
