const User = require("../models/user");
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

router.post("/", (req, res, next) => {
  const { username, password, fullname } = req.body;

  const requiredFields = ["username", "password"];

  const missingField = requiredFields.find(field => !(field in req.body));

  if (missingField) {
    return res.status(422).json({
      code: 422,
      reason: "Validation error",
      message: "Incorrect field type: missing a username or password",
      location: missingField
    });
  }
  const stringFields = ["username", "password", "fullname"];
  const notAString = stringFields.find(field => {
    return field in req.body && typeof req.body[field] !== "string";
  });

  if (notAString) {
    return res.status(422).json({
      code: 422,
      reason: "Validation error",
      message: "Incorrect field type: expected a string",
      location: notAString
    });
  }

  const nonTrimmedField = requiredFields.find(field => {
    return req.body[field].trim() !== req.body[field];
  });

  if (nonTrimmedField) {
    return res.status(422).json({
      code: 422,
      reason: "Validation error",
      message: "Incorrect field type: must not have trailing whitespace",
      location: nonTrimmedField
    });
  }

  const sizedFields = {
    username: {
      min: 1
    },
    password: {
      min: 8,
      max: 72
    }
  };

  const tooSmall = Object.keys(sizedFields).find(field => {
    return 'min' in sizedFields[field] && 
    req.body[field].trim().length < sizedFields[field].min;
  });

  const tooLarge = Object.keys(sizedFields).find(field => {
    return 'max' in sizedFields[field] && 
    req.body[field].trim().length > sizedFields[field].max;
  });

  if (tooSmall || tooLarge) {
    return res.status(422).json({
      code: 422,
      reason: 'Validation Error',
      message: tooSmall ? `Must be at least ${sizedFields[tooSmall].min} characters long` : `Must be at most ${sizedFields[tooLarge].max} characters long`,
      location: tooSmall || tooLarge
    });
  }

  return User.hashPassword(password)
    .then(digest => {
      const newUser = {
        username,
        password: digest,
        fullname
      };
      return User.create(newUser);
    })
    .then(newUser => {
      res
        .location(`${req.originalUrl}/${newUser.id}`)
        .status(201)
        .json(newUser);
    })
    .catch(err => {
      if (err.code === 11000) {
        err = new Error("User already exists");
        err.status = 400;
      }
      next(err);
    });
});

module.exports = router;
