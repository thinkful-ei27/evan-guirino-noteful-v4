'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const { TEST_MONGODB_URI } = require('../config');

const User = require('../models/user');

const expect = chai.expect;

chai.use(chaiHttp);

describe('Noteful API - Users', function() {
  const username = 'exampleUser';
  const password = 'examplePass';
  const fullname = 'Example User';

  before(function() {
    return mongoose
      .connect(
        TEST_MONGODB_URI,
        { useNewUrlParser: true, useCreateIndex: true }
      )
      .then(() => User.deleteMany());
  });

  beforeEach(function() {
    return User.createIndexes();
  });

  afterEach(function() {
    return User.deleteMany();
  });

  after(function() {
    return mongoose.disconnect();
  });

  describe('POST /api/users', function() {
    it('Should create a new user', function() {
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password, fullname })
        .then(_res => {
          res = _res;
          expect(res).to.have.status(201);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'username', 'fullname');
          expect(res.body.id).to.exist;
          expect(res.body.username).to.equal(username);
          expect(res.body.fullname).to.equal(fullname);
          return User.findOne({ username });
        })
        .then(user => {
          expect(user).to.exist;
          expect(user.id).to.equal(res.body.id);
          expect(user.fullname).to.equal(fullname);
          return user.validatePassword(password);
        })
        .then(isValid => {
          expect(isValid).to.be.true;
        });
    });

    it('Should reject users with missing username', function() {
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({ password, fullname })
        .then(_res => {
          res = _res;
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('Validation error');
          expect(res.body.message).to.equal(
            'Incorrect field type: missing a username or password'
          );
          expect(res.body.location).to.equal('username');
        });
    });
    it('Should reject users with missing password', function() {
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, fullname })
        .then(_res => {
          res = _res;
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('Validation error');
          expect(res.body.message).to.equal(
            'Incorrect field type: missing a username or password'
          );
          expect(res.body.location).to.equal('password');
        });
    });
    it('Should reject users with non-string username', function() {
      return chai
        .request(app)
        .post('/api/users')
        .send({ username: 123, password, fullname })
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('Validation error');
          expect(res.body.message).to.equal(
            'Incorrect field type: expected a string'
          );
          expect(res.body.location).to.equal('username');
        });
    });
    it('Should reject users with non-string password', function() {
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password: 12345678 })
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('Validation error');
          expect(res.body.message).to.equal(
            'Incorrect field type: expected a string'
          );
          expect(res.body.location).to.equal('password');
        });
    });
    it('Should reject users with non-trimmed username', function() {
      return chai
        .request(app)
        .post('/api/users')
        .send({ username: 'user  ', password })
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('Validation error');
          expect(res.body.message).to.equal(
            'Incorrect field type: must not have trailing whitespace'
          );
          expect(res.body.location).to.equal('username');
        });
    });
    it('Should reject users with non-trimmed password', function() {
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password: 'password  ' })
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('Validation error');
          expect(res.body.message).to.equal(
            'Incorrect field type: must not have trailing whitespace'
          );
          expect(res.body.location).to.equal('password');
        });
    });
    it('Should reject users with empty username', function() {
      return chai
        .request(app)
        .post('/api/users')
        .send({ username: '', password })
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('Validation error');
          expect(res.body.message).to.equal(
            'Must be at least 1 characters long'
          );
          expect(res.body.location).to.equal('username');
        });
    });
    it('Should reject users with password less than 8 characters', function() {
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password: '1234567' })
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('Validation error');
          expect(res.body.message).to.equal(
            'Must be at least 8 characters long'
          );
          expect(res.body.location).to.equal('password');
        });
    });
    it('Should reject users with password greater than 72 characters', function() {
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password: new Array(73).fill('a').join('') })
        .then(res => {
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('Validation error');
          expect(res.body.message).to.equal(
            'Must be at most 72 characters long'
          );
          expect(res.body.location).to.equal('password');
        });
    });
    it('Should reject users with duplicate username', function() {
      const testUser = {
        username,
        password
      };
      return User.create(testUser).then(testUser => {
        return chai
          .request(app)
          .post('/api/users')
          .send({ username, password })
          .then(res => {
            expect(res).to.have.status(400);
            expect(res.body.message).to.equal('User already exists');
          });
      });
    });
    it('Should trim fullname', function() {
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password, fullname: '  Evan' })
        .then(res => {
          expect(res).to.have.status(201);
          expect(res.body.fullname).to.equal('Evan');
          expect(res.body).to.have.keys('id', 'fullname', 'username');
          expect(res).to.be.an('object');
        });
    });
  });
});
