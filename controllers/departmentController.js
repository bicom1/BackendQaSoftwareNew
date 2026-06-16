const Department = require("../models/Department");

const DEFAULT_DEPARTMENTS = [
  "Sales",
  "Quality Control",
  "Marketing",
  "Customer Support",
  "Operations",
];

const ensureDefaults = async () => {
  const count = await Department.countDocuments();
  if (count === 0) {
    await Department.insertMany(
      DEFAULT_DEPARTMENTS.map((name) => ({ name })),
      { ordered: false }
    ).catch(() => {});
  }
};

const getAllDepartments = async (req, res) => {
  try {
    await ensureDefaults();
    const departments = await Department.find().sort({ name: 1 });
    res.json({ success: true, data: departments });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

const createDepartment = async (req, res) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name || name.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Department name is required (min 2 characters)",
      });
    }

    const existing = await Department.findOne({
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
    });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Department already exists",
        data: existing,
      });
    }

    const department = await Department.create({ name });
    res.status(201).json({
      success: true,
      message: "Department created",
      data: department,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

module.exports = { getAllDepartments, createDepartment };
