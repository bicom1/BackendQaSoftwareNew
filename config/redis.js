const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("Redis: max reconnection attempts reached");
        return new Error("Redis reconnection limit exceeded");
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on("error", (err) => {
  console.error("Redis error:", err.message);
});

redisClient.on("connect", () => {
  console.log("Redis connected successfully");
});

redisClient.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

module.exports = redisClient;
