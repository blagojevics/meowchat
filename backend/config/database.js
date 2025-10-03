const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Get MongoDB URI with fallback values
    const mongoURI =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      process.env.DATABASE_URL ||
      "mongodb://localhost:27017/meowchat";

    // Validate URI before connecting
    if (!mongoURI || mongoURI === "undefined") {
      throw new Error(
        "MongoDB URI is not defined. Please set MONGODB_URI environment variable."
      );
    }

    // Check for common MongoDB Atlas URI issues
    if (mongoURI.includes("mongodb+srv://")) {
      if (mongoURI.includes("@@")) {
        throw new Error(
          "❌ MongoDB URI contains double @ symbols. Please check your connection string."
        );
      }
      if (!mongoURI.includes("@") || mongoURI.split("@").length !== 2) {
        throw new Error(
          "❌ Invalid MongoDB Atlas URI format. Expected: mongodb+srv://username:password@cluster.mongodb.net/database"
        );
      }
    }

    console.log("🔍 Attempting MongoDB connection...");
    console.log(`📍 MongoDB URI: ${mongoURI.replace(/\/\/.*@/, "//***:***@")}`); // Hide credentials in logs

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      heartbeatFrequencyMS: 2000, // Check server every 2 seconds
    });

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error("❌ Database connection error:", error.message);

    // Provide specific guidance based on error type
    if (error.message.includes("Protocol and host list are required")) {
      console.error(
        "🔧 SOLUTION: Your MongoDB URI has a syntax error (likely double @@ symbols)"
      );
      console.error(
        "   ❌ Wrong: mongodb+srv://user:pass@@cluster.mongodb.net"
      );
      console.error(
        "   ✅ Correct: mongodb+srv://user:pass@cluster.mongodb.net"
      );
    } else if (error.message.includes("authentication failed")) {
      console.error("🔧 SOLUTION: Check your MongoDB username and password");
    } else if (error.message.includes("ENOTFOUND")) {
      console.error(
        "🔧 SOLUTION: Check your cluster hostname and internet connection"
      );
    } else if (error.message.includes("IP address") || error.message.includes("whitelist") || error.message.includes("Could not connect to any servers")) {
      console.error("🔧 SOLUTION: MongoDB Atlas IP Whitelist Issue (COMMON ON RAILWAY)");
      console.error("   1. Go to MongoDB Atlas → Network Access");
      console.error("   2. Click 'Add IP Address'");
      console.error("   3. Add '0.0.0.0/0' to allow all IPs (REQUIRED FOR RAILWAY)");
      console.error("   4. Or try these Railway IP ranges:");
      console.error("      - Add 'Railway' as description");
      console.error("      - IP: 0.0.0.0/0 (simplest for Railway)");
      console.error("   🚨 Railway uses dynamic IPs, so 0.0.0.0/0 is often required");
    } else if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
      console.error("🔧 SOLUTION: Connection timeout - likely network or IP whitelist issue");
      console.error("   1. Check MongoDB Atlas IP whitelist");
      console.error("   2. Verify cluster is running (not paused)");
      console.error("   3. Check Railway network connectivity");
    }

    console.error("🔧 Environment check:");
    console.error(
      `   MONGODB_URI: ${process.env.MONGODB_URI ? "SET" : "NOT SET"}`
    );
    console.error(`   MONGO_URI: ${process.env.MONGO_URI ? "SET" : "NOT SET"}`);
    console.error(
      `   DATABASE_URL: ${process.env.DATABASE_URL ? "SET" : "NOT SET"}`
    );
    console.error(`   NODE_ENV: ${process.env.NODE_ENV || "not set"}`);

    // Don't exit in production, let it retry
    if (process.env.NODE_ENV === "production") {
      console.error(
        "⚠️ Production mode: Will retry connection in 5 seconds..."
      );
      setTimeout(() => connectDB(), 5000);
    } else {
      process.exit(1);
    }
  }
};

module.exports = connectDB;
