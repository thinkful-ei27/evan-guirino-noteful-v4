const bycrypt = require('bcryptjs');

const password = 'password';

bycrypt.hash(password, 10)
  .then(digest => {
    console.log('digest = ', digest);
    return digest;
  })
  .catch(err => {
    console.log('error', err);
  });