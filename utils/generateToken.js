import jwt from "jsonwebtoken";

const generateToken = (id) => {
  return jwt.sign({ userId: id }, process.env.SECRET_KEY, {
    expiresIn: "1d",
  });
};

export default generateToken; 