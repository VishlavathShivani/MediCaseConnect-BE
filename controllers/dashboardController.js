import sql from "../configs/db.js";



// Dashboard Controller
export const getDashboardData = async (req, res) => {
  try {
    // Aggregate dashboard data
    const totalUsers = await sql`SELECT COUNT(*) FROM users`
    const totalReports = await sql`SELECT COUNT(*) FROM reports WHERE is_deleted = FALSE`
    const totalDepartments = await sql`SELECT COUNT(*) FROM departments`

    res.json({
      success: true,
      message: "Dashboard data retrieved successfully",
      dashboardData: {
        totalUsers: totalUsers[0].count,
        totalReports: totalReports[0].count,
        totalDepartments: totalDepartments[0].count
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}