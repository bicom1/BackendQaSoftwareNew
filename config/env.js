function validateEnv() {
  const requiredEnvVars = ['MONGO_URL'];
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      console.error(`CRITICAL: Missing required environment variable: ${varName}`.bgRed);
      process.exit(1);
    }
  });
}

module.exports = { validateEnv };
