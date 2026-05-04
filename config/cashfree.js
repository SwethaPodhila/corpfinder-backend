const { Cashfree, CFEnvironment } = require("cashfree-pg");

const cashfree = new Cashfree();

// 🔥 Environment setup
cashfree.XEnvironment =
    process.env.NODE_ENV === "production"
        ? CFEnvironment.PRODUCTION
        : CFEnvironment.SANDBOX;

// 🔑 Credentials
cashfree.XClientId = process.env.CF_APP_ID;
cashfree.XClientSecret = process.env.CF_SECRET_KEY;

module.exports = { cashfree };