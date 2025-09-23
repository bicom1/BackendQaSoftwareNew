module.exports = (err, req, res, next) => {
  console.error("Unhandled Error:".red, err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred'
  });
};
