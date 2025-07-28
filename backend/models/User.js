const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, trim: true },
    // 실제 애플리케이션에서는 비밀번호를 반드시 해싱하여 저장해야 합니다.
    password: { type: String, required: true },
    name: { type: String, required: true },
    position: String,
    region: String,
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    monthlyQuota: { type: Number, default: 100 },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
