const { setCors, handleOptions } = require("../lib/cors");

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  return res.status(200).json({
    name: "AI Resume Optimizer API",
    version: "1.0.0",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
};
