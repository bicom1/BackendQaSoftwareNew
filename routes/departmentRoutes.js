const express = require("express");
const {
  getAllDepartments,
  createDepartment,
} = require("../controllers/departmentController");

const router = express.Router();

router.get("/", getAllDepartments);
router.post("/create", createDepartment);

module.exports = router;
