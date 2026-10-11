const logoutController = (req, res) => {
  res.clearCookie("authToken", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  }).status(200).send({ message: "Logout successful" });
};

module.exports = logoutController;
