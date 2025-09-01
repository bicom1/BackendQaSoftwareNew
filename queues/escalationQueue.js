const Queue = require("bull");
const Escalation = require("../models/Escalation");

// Create a Bull Queue (needs Redis running)
const escalationQueue = new Queue("escalation-queue", {
  redis: {
    host: "127.0.0.1",
    port: 6379,
  },
});

// Process jobs
escalationQueue.process("create-escalation", async (job, done) => {
  try {
    const newEscalation = new Escalation(job.data);
    await newEscalation.save();
    console.log("✅ Escalation saved from queue:", newEscalation._id);
    done();
  } catch (error) {
    console.error("❌ Error processing escalation queue:", error);
    done(error);
  }
});

module.exports = escalationQueue;