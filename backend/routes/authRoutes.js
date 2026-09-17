 const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
} = require("../controllers/authController");

const {
  forgotPassword,
  resetPassword,
} = require("../controllers/passwordResetController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");


router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/profile", authMiddleware, getProfile);

router.put("/profile", authMiddleware, updateProfile);


// Password Reset
router.post("/forgot-password", forgotPassword);

router.post("/reset-password", resetPassword);


// Administrator test
router.get(
  "/admin-test",
  authMiddleware,
  roleMiddleware("Administrator"),
  (req, res) => {
    res.json({
      message: "Administrator access granted",
      user: req.user,
    });
  }
);


module.exports = router;