import jwt from "jsonwebtoken";
import sql from "../configs/db.js";

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email != process.env.ADMIN_EMAIL || password != process.env.ADMIN_PASSWORD) {
      return res.json({ success: false, message: "Invalid Credentials" })
    }

    const token = jwt.sign({ email }, process.env.JWT_SECRET)
    res.json({ success: true, token })

  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

// User Management Controllers
export const getAllUsers = async (req, res) => {
  try {
    const { email } = req.query;
    const limit = 10;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;

    // If email is provided, search by email
    if (email) {
      const user = await sql`
        SELECT id, name, email, role, branch_code, dept_code
        FROM users
        WHERE email = ${email}
      `;
      
      if (!user.length) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      
      return res.json({
        success: true,
        message: "User retrieved successfully",
        user: user[0]
      });
    }

    // Get total count
    const totalResult = await sql`SELECT COUNT(*) AS total FROM users`;
    const totalCount = totalResult[0].total;

    // Get paginated users
    const users = await sql`
      SELECT id, name, email, role, branch_code, dept_code 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    res.json({
      success: true,
      message: "Users retrieved successfully",
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      users
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const addUser = async (req, res) => {
  try {

    const { email, name, role, branchCode, deptCode } = req.body

    const user = await sql`INSERT INTO users (email, name, role, branch_code, dept_code)
      VALUES (${email}, ${name}, ${role}, ${branchCode}, ${deptCode})
      RETURNING id`;

    res.json({
      success: true,
      message: "User created successfully",
      user: user[0].id
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const updateUserById = async (req, res) => {
  try {

    const { id } = req.params
    const { email, name, role, branchCode, deptCode } = req.body

    const user = await sql`UPDATE users SET email = ${email}, name = ${name}, role = ${role}, branch_code = ${branchCode}, dept_code = ${deptCode} WHERE id = ${id} RETURNING id`;

    res.json({
      success: true,
      message: "User updated successfully",
      user: user[0].id
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const deleteUserById = async (req, res) => {
  try {

    const { id } = req.params

    await sql`DELETE FROM users WHERE id = ${id};`

    res.json({
      success: true,
      message: "User deleted successfully",
      user: id
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}





