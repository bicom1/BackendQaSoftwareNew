const bcrypt = require("bcrypt");

const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$/;

const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
};

const comparePassword = async (plainPassword, storedPassword) => {
  if (!plainPassword || !storedPassword) return false;
  if (!BCRYPT_HASH_REGEX.test(storedPassword)) {
    return plainPassword === storedPassword;
  }
  return bcrypt.compare(plainPassword, storedPassword);
};

module.exports = { hashPassword, comparePassword, BCRYPT_HASH_REGEX };
