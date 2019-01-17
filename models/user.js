const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const user = new mongoose.Schema({
  fullname: { type: String },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

user.set('toJSON', {
  virtuals: true,
  transform: (doc, result) => {
    delete result._id;
    delete result.__v;
    delete result.password;
  }
});

user.methods.validatePassword = function(incomingPassword) {
  return bcrypt.compare(incomingPassword, this.password);
};

user.statics.hashPassword = function(incomingPassword) {
  const digest = bcrypt.hash(incomingPassword, 10);
  return digest;
};

module.exports = mongoose.model('User', user);
