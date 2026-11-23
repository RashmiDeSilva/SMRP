const AuditLog = require('../models/AuditLog');

const logActivity = async ({ action, targetModel, targetId, details, user, req }) => {
  try {
    let resolvedUser = user;

    // Resolve request activity only from the authenticated session.
    if (!resolvedUser && req) {
      resolvedUser = req.user || null;
    }

    const ownerDetails = resolvedUser
      ? {
          userId: resolvedUser._id,
          name: resolvedUser.name,
          email: resolvedUser.email,
          role: resolvedUser.role,
        }
      : undefined;

    await AuditLog.create({
      action,
      targetModel,
      targetId,
      details,
      owner: ownerDetails,
    });
  } catch (error) {
    console.error('Error creating audit log:', error.message);
  }
};

module.exports = logActivity;
