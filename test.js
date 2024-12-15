const bcrypt = require('bcryptjs');
const password = '1234';  // The password you are testing with
const hash = '$2a$10$m1uKn3ptlwNAnvrnhmFjM.9XliAiIwqrS2yI7mI0KZl...'; // The stored hash from DB

bcrypt.compare(password, hash, (err, result) => {
  console.log(result); // This should be true if password matches
});
