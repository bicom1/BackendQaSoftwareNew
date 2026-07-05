/**
 * One-time: upsert Super Admin into the DB from MONGO_URL (use same URL as Render).
 * Run: node scripts/upsert-superadmin.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/usermodel");
const { hashPassword } = require("../helpers/password");

const EMAIL = "ibrahim@bicommunications.ae";
const PASSWORD = "ibrahim123";
const NAME = "Ibrahim";
const ROLE = "superadmin";

async function main() {
  if (!process.env.MONGO_URL) {
    console.error("Set MONGO_URL in .env to your Atlas URI (same as Render).");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URL);
  console.log("Connected to database:", mongoose.connection.name);

  const hashed = await hashPassword(PASSWORD);
  const user = await User.findOneAndUpdate(
    { email: EMAIL },
    {
      email: EMAIL,
      password: hashed,
      name: NAME,
      role: ROLE,
      isOnline: false,
      status: "offline",
    },
    { upsert: true, new: true }
  );

  console.log("Super Admin ready:", user.email, "role:", user.role);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
