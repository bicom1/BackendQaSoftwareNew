const { createClient } = require("redis");

const redisUrl =
  process.env.REDIS_URL || process.env.REDIS_TLS_URL || "";

const useTls =
  redisUrl.startsWith("rediss://") ||
  /upstash|render\.com|redis-cloud/i.test(redisUrl);

const redisClient = createClient({
  url: redisUrl || "redis://127.0.0.1:6379",
  socket: {
    ...(useTls
      ? { tls: true, rejectUnauthorized: false }
      : {}),
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("Redis: max reconnection attempts reached");
        return new Error("Redis reconnection limit exceeded");
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on("connect", () => {
  console.log("✅ Redis Connected");
});

redisClient.on("ready", () => {
  console.log("✅ Redis Ready");
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err.message || err);
});

redisClient.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

async function connectRedis() {
  if (!redisUrl) {
    console.warn(
      "⚠️  REDIS_URL not set — skipping Redis (login and API still work; OTP rate limits use in-memory fallback)."
        .yellow
    );
    return false;
  }

  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    return true;
  } catch (err) {
    console.error(
      "⚠️  Redis connection failed — continuing without Redis:",
      err.message || err
    );
    return false;
  }
}

module.exports = redisClient;
module.exports.connectRedis = connectRedis;
