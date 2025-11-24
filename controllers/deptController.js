import sql from "../configs/db.js";

// Department Management Controllers
export const getAllDepartments = async (req, res) => {
  try {
    const { code } = req.query

    // If code is provided, search by code
    if (code) {
      const dept = await sql`
        SELECT code, name, description, logo_url
        FROM departments
        WHERE code = ${code}
      `

      if (!dept.length) {
        return res.status(404).json({
          error: 'Department not found'
        })
      }
      
      return res.json({
        success: true,
        message: "Department retrieved successfully",
        department: dept[0]
      })
    }

    const depts = await sql`SELECT code, name, description, logo_url FROM departments ORDER BY name ASC LIMIT 10`

    res.json({
      success: true,
      message: "Departments retrieved successfully",
      departments: depts
    })

  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const addDepartment = async (req, res) => {
  try {

    const { code, name, description } = req.body
    const logoUrl = req.file.location;

    const dept = await sql`INSERT INTO departments (code, name, description, logo_url)
      VALUES (${code}, ${name}, ${description}, ${logoUrl})
      RETURNING code`;

    res.json({
      success: true,
      message: "Department created successfully",
      department: dept[0].code
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}

export const updateDepartmentByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { name, description } = req.body;
    const logoUrl = req.file?.location || null;

    let dept;

    // Update with or without logo
    if (logoUrl) {
      dept = await sql`
        UPDATE departments 
        SET name = ${name}, description = ${description}, logo_url = ${logoUrl}
        WHERE code = ${code}
        RETURNING *
      `;
    } else {
      dept = await sql`
        UPDATE departments 
        SET name = ${name}, description = ${description}
        WHERE code = ${code}
        RETURNING *
      `;
    }

    if (dept.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Department not found' 
      });
    }

    res.json({
      success: true,
      message: "Department updated successfully",
      department: dept[0]
    });
    
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


export const deleteDepartmentByCode = async (req, res) => {
  try {

    const { code } = req.params

    await sql`DELETE FROM departments WHERE code = ${code};`

    res.json({
      success: true,
      message: "Department deleted successfully",
      department: code
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}




//Branch Management Controllers

export const getAllBranches = async (req, res) => {
  try {
    

    const branches = await sql`SELECT code, name, city, country, email, phone_number FROM branches ORDER BY name ASC`

    res.json({
      success: true,
      message: "Branches retrieved successfully",
      branches: branches
    })

  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
