const serverless = require("serverless-http");
const { app, initializeApp } = require("../index");

const handler = serverless(app);

module.exports = async (req, res) => {
  await initializeApp();
  return handler(req, res);
};
