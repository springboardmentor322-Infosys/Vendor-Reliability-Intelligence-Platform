 const express = require("express");

const router = express.Router();

const {
  getCommunications,
  getCommunicationById,
  getCommunicationThread,
  createCommunication,
  replyToCommunication,
  updateCommunication,
  updateCommunicationStatus,
  deleteCommunication,
} = require("../controllers/communicationController");

const authMiddleware = require("../middleware/authMiddleware");

router.get(
  "/",
  authMiddleware,
  getCommunications
);

router.get(
  "/thread/:entity_type/:entity_id",
  authMiddleware,
  getCommunicationThread
);

router.get(
  "/:id",
  authMiddleware,
  getCommunicationById
);

router.post(
  "/",
  authMiddleware,
  createCommunication
);

router.post(
  "/:id/reply",
  authMiddleware,
  replyToCommunication
);

router.put(
  "/:id",
  authMiddleware,
  updateCommunication
);

router.patch(
  "/:id/status",
  authMiddleware,
  updateCommunicationStatus
);

router.delete(
  "/:id",
  authMiddleware,
  deleteCommunication
);

module.exports = router;