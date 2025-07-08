const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/user.model');

const SECRET_KEY = process.env.JWT_SECRET_KEY;

const registerUser = async (email, password) => {
  const existingUser = await userModel.findUserByEmail(email);
  if (existingUser) {
    const error = new Error('이미 사용 중인 이메일입니다.');
    error.statusCode = 409;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  
  return userModel.createUser(email, passwordHash);
};

const loginUser = async (email, password) => {
    const user = await userModel.findUserByEmail(email);
    if (!user) {
        return null;
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordCorrect) {
        return null;
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });
    return { token, user };
};

module.exports = { registerUser, loginUser };