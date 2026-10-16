const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const PASSWORD_MESSAGE =
  "Password must be at least 8 characters with one uppercase, one lowercase, one number and one special character (@$!%*?&)";

function validatePassword(password) {
  if (typeof password !== "string") return "Invalid password";
  if (!PASSWORD_REGEX.test(password)) return PASSWORD_MESSAGE;
  return null; // null means the password is valid
}

module.exports = { validatePassword, PASSWORD_REGEX, PASSWORD_MESSAGE };