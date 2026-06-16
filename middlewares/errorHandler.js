module.exports = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  if (status >= 500) {
    console.error("Unhandled Error:".red, err.stack || err.message);
  }
  res.status(status).json({
    success: false,
    code: err.code || "INTERNAL_ERROR",
    message: err.message || "An unexpected error occurred",
  });
};
