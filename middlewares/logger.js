module.exports = (req, res, next) => {
  console.log("--- GLOBAL DEBUG: Request Received ---".magenta);
  console.log("Method:".magenta, req.method);
  console.log("URL:".magenta, req.originalUrl);
  next();
};
