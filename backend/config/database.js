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

    console.log("🔍 Attempting MongoDB connection...");
    console.log(`📍 MongoDB URI: ${mongoURI.replace(/\/\/.*@/, "//***:***@")}`); // Hide credentials in logs

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`🍃 MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
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
