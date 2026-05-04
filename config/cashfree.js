const { Cashfree, CFEnvironment } = require("cashfree-pg");

const cashfree = new Cashfree(
    CFEnvironment.SANDBOX, // ✅ correct
    process.env.CF_APP_ID,
    process.env.CF_SECRET_KEY
);

module.exports = { cashfree };