function validateEnv() {
  const requiredEnvVars = ["MONGO_URL"];
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      console.error(
        `CRITICAL: Missing required environment variable: ${varName}`.bgRed
      );
      process.exit(1);
    }
  });

  if (!process.env.JWT_SECRET) {
    console.warn(
      "⚠️  JWT_SECRET is not set — login will fail until you add it on Render.".yellow
    );
  }
}

module.exports = { validateEnv };
