const User = require("../models/User");
const { generateToken } = require("../config/jwt");
const firebaseService = require("../config/firebase");
const encryptionService = require("./encryptionService");

class HybridAuthService {
  // Login with local credentials OR Firebase token
  async login(loginData) {
    const { email, password, firebaseToken } = loginData;

    // Option 1: Firebase token login (from Meowgram)
    if (firebaseToken) {
      return await this.loginWithFirebase(firebaseToken);
    }

    // Option 2: Local email/password login
    if (email && password) {
      return await this.loginLocal(email, password);
    }

    throw new Error("Invalid login credentials");
  }

  // Local MongoDB authentication
  async loginLocal(email, password) {
    // Find user in local MongoDB
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken({ id: user._id, type: "local" });

    return {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
        isOnline: user.isOnline,
        type: "local",
      },
    };
  }

  // Firebase authentication (sync from Meowgram)
  async loginWithFirebase(firebaseToken) {
    try {
      // Verify Firebase token
      const decodedToken = await firebaseService.verifyFirebaseToken(
        firebaseToken
      );
      const { uid, email, name, picture, firebase } = decodedToken;

      // Determine if this is a Google sign-in
      const isGoogleAuth = firebase.sign_in_provider === "google.com";

      console.log(
        `🔥 Firebase login - UID: ${uid}, Email: ${email}, Provider: ${firebase.sign_in_provider}`
      );

      // Try to find existing local user linked to this Firebase UID
      let localUser = await User.findOne({ firebaseUid: uid });

      // If no local user exists, sync from Meowgram or create from Firebase data
      if (!localUser) {
        let userData;

        try {
          // Try to sync from Meowgram first
          userData = await firebaseService.syncUserFromMeowgram(uid);
          console.log(
            `📡 Synced user from Meowgram: ${userData?.username || "Not found"}`
          );
        } catch (error) {
          console.log(`⚠️ Could not sync from Meowgram: ${error.message}`);
        }

        // If no Meowgram user found, create from Firebase/Google data
        if (!userData) {
          console.log(
            `🆕 Creating new user from ${
              isGoogleAuth ? "Google" : "Firebase"
            } data`
          );
          userData = {
            username: this.generateUsernameFromEmail(email),
            email: email,
            displayName: name || "",
            profilePicture: picture || "",
            bio: isGoogleAuth
              ? "Joined via Google Sign-In"
              : "Joined via Firebase",
            isFromMeowgram: false, // Mark as false since they're not from Meowgram
            firebaseUid: uid,
          };
        }

        // Generate RSA key pair for end-to-end encryption
        // For Firebase users, we use a temporary password to encrypt the private key
        const tempPassword = uid + email; // Unique per user
        const { publicKey, privateKey } =
          encryptionService.generateUserKeyPair();
        const encryptedPrivateKey = encryptionService.encryptPrivateKey(
          privateKey,
          tempPassword
        );

        // Create local user
        localUser = new User({
          firebaseUid: uid,
          username: userData.username,
          email: userData.email,
          displayName: userData.displayName || name || "",
          profilePicture: userData.profilePicture || picture || "",
          bio: userData.bio || "",
          isFromMeowgram: !!userData.isFromMeowgram,
          // Don't store password for Firebase users
          password: "firebase_auth_user",
          isOnline: true,
          lastSeen: new Date(),
          publicKey,
          encryptedPrivateKey,
        });

        await localUser.save();
        console.log(
          `✅ Created local user with encryption: ${localUser.username}`
        );
      } else {
        // Update online status and sync latest data for existing user
        localUser.isOnline = true;
        localUser.lastSeen = new Date();

        // Update display name and profile picture from Google if available
        if (name && name !== localUser.displayName) {
          localUser.displayName = name;
        }
        if (picture && picture !== localUser.profilePicture) {
          localUser.profilePicture = picture;
        }

        await localUser.save();
        console.log(`🔄 Updated existing user: ${localUser.username}`);
      }

      // Generate JWT token
      const token = generateToken({
        id: localUser._id,
        firebaseUid: uid,
        type: "firebase",
        provider: firebase.sign_in_provider,
      });

      return {
        token,
        user: {
          id: localUser._id,
          username: localUser.username,
          email: localUser.email,
          displayName: localUser.displayName,
          profilePicture: localUser.profilePicture,
          bio: localUser.bio,
          isOnline: localUser.isOnline,
          type: "firebase",
          provider: firebase.sign_in_provider,
          isFromMeowgram: localUser.isFromMeowgram,
        },
      };
    } catch (error) {
      console.error("Firebase login error:", error);
      throw new Error("Firebase authentication failed");
    }
  }

  // Helper method to generate username from email
  generateUsernameFromEmail(email) {
    const baseUsername = email.split("@")[0].toLowerCase();
    // Add random suffix to ensure uniqueness
    const suffix = Math.floor(Math.random() * 1000);
    return `${baseUsername}${suffix}`;
  }

  // Register new local user
  async registerLocal(userData) {
    const { username, email, password, profilePicture, bio } = userData;

    // Check if user already exists (local or Firebase)
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new Error(
        existingUser.email === email
          ? "Email already registered"
          : "Username already taken"
      );
    }

    // Generate RSA key pair for end-to-end encryption
    const { publicKey, privateKey } = encryptionService.generateUserKeyPair();

    // Encrypt private key with user's password
    const encryptedPrivateKey = encryptionService.encryptPrivateKey(
      privateKey,
      password
    );

    // Create new local user
    const user = new User({
      username,
      email,
      password,
      profilePicture: profilePicture || "",
      bio: bio || "",
      isFromMeowgram: false,
      publicKey,
      encryptedPrivateKey,
    });

    await user.save();

    console.log(`🔐 Generated encryption keys for user: ${username}`);

    // Generate JWT token
    const token = generateToken({ id: user._id, type: "local" });

    return {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
        type: "local",
      },
    };
  }

  // Get user by ID (works for both local and Firebase users)
  async getUserById(userId) {
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }

    // If user is from Meowgram, optionally sync latest data
    if (user.isFromMeowgram && user.firebaseUid) {
      try {
        const meowgramUser = await firebaseService.syncUserFromMeowgram(
          user.firebaseUid
        );
        if (meowgramUser) {
          // Update local user with latest Meowgram data
          user.profilePicture = meowgramUser.profilePicture;
          user.bio = meowgramUser.bio;
          user.displayName = meowgramUser.displayName;
          await user.save();
        }
      } catch (error) {
        console.log("Could not sync user from Meowgram:", error.message);
      }
    }

    return user;
  }

  // Get all users for chat creation (excludes current user)
  async getAllUsers(currentUserId) {
    const results = [];

    // Get all local users except current user
    const localUsers = await User.find({
      _id: { $ne: currentUserId },
    })
      .select("username email profilePicture bio isOnline lastSeen")
      .limit(50);

    results.push(...localUsers);

    return results;
  }

  // Search for users (includes both local and Meowgram users)
  async searchUsers(searchTerm, limit = 10) {
    const results = [];

    // Search local users
    const localUsers = await User.find({
      $or: [
        { username: { $regex: searchTerm, $options: "i" } },
        { displayName: { $regex: searchTerm, $options: "i" } },
      ],
    }).limit(limit);

    results.push(...localUsers);

    // Search Meowgram users if Firebase is connected
    try {
      const meowgramUsers = await firebaseService.searchMeowgramUsers(
        searchTerm
      );

      // Convert Meowgram users to local format and filter out duplicates
      for (const meowgramUser of meowgramUsers) {
        const existingLocal = await User.findOne({
          firebaseUid: meowgramUser.uid,
        });

        if (!existingLocal) {
          results.push({
            _id: `firebase_${meowgramUser.uid}`,
            username: meowgramUser.username,
            email: meowgramUser.email,
            profilePicture: meowgramUser.avatarUrl,
            bio: meowgramUser.bio,
            isFromMeowgram: true,
            firebaseUid: meowgramUser.uid,
          });
        }
      }
    } catch (error) {
      console.log("Could not search Meowgram users:", error.message);
    }

    return results.slice(0, limit);
  }
}

module.exports = new HybridAuthService();
