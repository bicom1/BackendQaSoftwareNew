// migrate.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// 1️⃣ Database Connections
const OLD_DB = "mongodb+srv://qcdev:W6HWd9jG4lZDTNLh@bic.vifauen.mongodb.net/";
const NEW_DB = "mongodb+srv://backend:backend123@backend.y22c64l.mongodb.net/";

const oldConnection = mongoose.createConnection(OLD_DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const newConnection = mongoose.createConnection(NEW_DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// 2️⃣ Define OLD Schemas (non-strict)
const OldUserSchema = new mongoose.Schema({}, { strict: false });
const OldEvaluationSchema = new mongoose.Schema({}, { strict: false });
const OldEscalationSchema = new mongoose.Schema({}, { strict: false });
const OldTeamLeadSchema = new mongoose.Schema({}, { strict: false });

const OldUser = oldConnection.model("User", OldUserSchema);
const OldEvaluation = oldConnection.model("Evaluation", OldEvaluationSchema);
const OldEscalation = oldConnection.model("Escalation", OldEscalationSchema);
const OldTeamLead = oldConnection.model("teamlead", OldTeamLeadSchema);

// 3️⃣ Define NEW Schemas
const NewUser = newConnection.model(
  "User",
  new mongoose.Schema(
    {
      email: { type: String, lowercase: true, trim: true },
      password: { type: String, select: false },
      name: String,
      role: String,
      isOnline: Boolean,
      lastActive: Date,
      socketId: String,
      loginCount: Number,
      currentSession: {
        token: String,
        expiresAt: Date,
        ipAddress: String,
        userAgent: String,
      },
      status: {
        type: String,
        enum: ["online", "offline", "away", "busy"],
        default: "offline",
      },
    },
    { timestamps: true }
  )
);

const NewEvaluation = newConnection.model(
  "Evaluation",
  new mongoose.Schema(
    {
      owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      useremail: String,
      leadID: Number,
      agentName: String,
      mod: String,
      teamleader: String,
      greetings: String,
      accuracy: String,
      building: String,
      presenting: String,
      closing: String,
      bonus: String,
      evaluationsummary: String,
      rating: Number,
      status: { type: String, enum: ["draft", "published", "archived"] },
      submissionSource: { type: String, enum: ["frontend", "bitrix"] },
      publishedAt: Date,
      bitrixSubmitted: Boolean,
    },
    { timestamps: true }
  )
);

const NewEscalation = newConnection.model(
  "Escalation",
  new mongoose.Schema(
    {
      owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      useremail: String,
      leadID: Number,
      evaluatedby: String,
      agentName: String,
      teamleader: String,
      leadsource: String,
      leadStatus: String,
      escSeverity: String,
      issueIden: String,
      escAction: String,
      documentation: String,
      successmaration: String,
      userrating: String,
      audio: String,
      status: { type: String, enum: ["draft", "published", "archived"] },
      submissionSource: { type: String, enum: ["frontend", "bitrix"] },
      publishedAt: Date,
      bitrixSubmitted: Boolean,
    },
    { timestamps: true }
  )
);

const NewTeamLead = newConnection.model(
  "TeamLeader",
  new mongoose.Schema({
    name: {
      type: String,
      required: true,
      trim: true,
      match: [/^[A-Za-z\s]+$/, "Name should only contain alphabets"],
    },
    createdAt: { type: Date, default: Date.now },
  })
);

// 4️⃣ Migration Function
async function migrate() {
  try {
    console.log("🔗 Connecting to databases...");
    await Promise.all([oldConnection.asPromise(), newConnection.asPromise()]);
    console.log("✅ Connected!");

    // USERS MIGRATION
    console.log("\n🚀 Migrating Users...");
    const oldUsers = await OldUser.find({});
    console.log(`Found ${oldUsers.length} users`);

    for (let user of oldUsers) {
      let password = user.password || "default123";
      const isHashed = password.startsWith("$2a$") || password.startsWith("$2b$");

      if (!isHashed) {
        const salt = await bcrypt.genSalt(10);
        password = await bcrypt.hash(password, salt);
      }

      const newUser = new NewUser({
        email: user.email?.toLowerCase(),
        password,
        name: user.name || "",
        role: user.role || "agent",
        isOnline: false,
        lastActive: user.lastActive || new Date(),
        loginCount: 0,
        status: "offline",
      });

      await newUser.save();
    }
    console.log("✅ Users migrated successfully");

    // EVALUATIONS MIGRATION
    console.log("\n🚀 Migrating Evaluations...");
    const oldEvals = await OldEvaluation.find({});
    for (let evalDoc of oldEvals) {
      const newEval = new NewEvaluation({
        owner: evalDoc.owner,
        useremail: evalDoc.useremail,
        leadID: parseInt(evalDoc.leadID) || 0,
        agentName: evalDoc.agentName,
        mod: evalDoc.mod,
        teamleader: evalDoc.teamleader,
        greetings: Array.isArray(evalDoc.greetings)
          ? evalDoc.greetings.join(", ")
          : evalDoc.greetings,
        accuracy: evalDoc.accuracy,
        building: evalDoc.building,
        presenting: evalDoc.presenting,
        closing: evalDoc.closing,
        bonus: evalDoc.bonus,
        evaluationsummary: evalDoc.evaluationsummary,
        rating: 0,
        status: "published",
        submissionSource: "frontend",
        bitrixSubmitted: false,
      });
      await newEval.save();
    }
    console.log("✅ Evaluations migrated successfully");

    // ESCALATIONS MIGRATION
    console.log("\n🚀 Migrating Escalations...");
    const oldEsc = await OldEscalation.find({});
    for (let esc of oldEsc) {
      const newEsc = new NewEscalation({
        owner: esc.owner,
        useremail: esc.useremail,
        leadID: parseInt(esc.leadID) || 0,
        evaluatedby: esc.evaluatedby,
        agentName: esc.agentName,
        teamleader: esc.teamleader,
        leadsource: esc.leadsource,
        leadStatus: esc.leadStatus,
        escSeverity: esc.escSeverity,
        issueIden: esc.issueIden,
        escAction: esc.escAction,
        documentation: esc.documentation,
        successmaration: esc.successmaration,
        userrating: esc.userrating,
        audio: esc.audio,
        status: "published",
        submissionSource: "frontend",
        bitrixSubmitted: false,
      });
      await newEsc.save();
    }
    console.log("✅ Escalations migrated successfully");

    // TEAMLEADS MIGRATION
    console.log("\n🚀 Migrating TeamLeads...");
    const oldLeads = await OldTeamLead.find({});
    for (let lead of oldLeads) {
      const newLead = new NewTeamLead({
        name: lead.leadName?.trim() || "Unknown",
        createdAt: lead.createdAt || new Date(),
      });
      await newLead.save();
    }
    console.log("✅ TeamLeads migrated successfully");

    console.log("\n🎉 All data migrated successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// 5️⃣ Run Migration
migrate();


// node migrate.js
