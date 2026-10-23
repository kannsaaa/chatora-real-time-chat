const jwt = require("jsonwebtoken");

function extractToken(req) {
  const authHeader = req.headers?.authorization;
  if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const bearer = authHeader.substring(7).trim();
    if (bearer) return bearer;
  }
  return req.cookies?.authToken || null;
}

async function protect(req) {
  return new Promise((resolve, reject) => {
    const token = extractToken(req);
    if (token) {
      jwt.verify(token, process.env.JWTPRIVATEKEY, {}, (err, userData) => {
        if (err) {
          reject(err);
        } else {
          resolve(userData);
        }
      });
    } else {
      reject("no token");
    }
  });
}

protect.extractToken = extractToken;

module.exports = protect;
