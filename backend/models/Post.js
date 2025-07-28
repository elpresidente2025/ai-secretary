const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String },
    status: { type: String, default: '초안' },
    // User 모델의 ObjectId를 참조하여 누가 작성했는지 저장합니다.
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { 
    // timestamps: true 옵션은 createdAt, updatedAt 필드를 자동으로 추가합니다.
    timestamps: true 
});

module.exports = mongoose.model('Post', PostSchema);
