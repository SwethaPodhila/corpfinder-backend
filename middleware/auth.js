const jwt = require("jsonwebtoken");

exports.verifyAdmin = (req, res, next) => {
    try {
        console.log("🔥 Middleware hit");

        const authHeader = req.headers.authorization;
      //  console.log("📩 Authorization Header:", authHeader);

        if (!authHeader) {
            console.log("❌ No Authorization header found");
            return res.status(401).json({ msg: "No token ❌" });
        }

        const token = authHeader.split(" ")[1];
        //console.log("🎟️ Extracted Token:", token);

        if (!token) {
            console.log("❌ Token missing after split");
            return res.status(401).json({ msg: "Token missing ❌" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

     //  console.log("✅ Decoded Token:", decoded);

        req.adminId = decoded.id;
        console.log("🆔 Admin ID set in req:", req.adminId);

        next();

    } catch (err) {
        console.log("💥 JWT ERROR MESSAGE:", err.message);
        console.log("💥 FULL ERROR:", err);

        return res.status(401).json({ msg: "Invalid token ❌" });
    }
};