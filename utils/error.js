/**
 * Creates a standardized error object with status code and message
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @returns {Error} Custom error object with statusCode and message
 */
const createError = (statusCode, message) => {
  const error = new Error();
  error.statusCode = statusCode;
  error.message = message;
  return error;
};

export default createError; 