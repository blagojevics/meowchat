// Firebase configuration for MeowChat (separate from Meowgram)
// You can use the same Firebase project but different collections, or create a new project

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin with service account
let firebaseApp;

try {
  // Load service account key from JSON file
  const serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));
  
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  }, 'meowchat');
  
  console.log('✅ Firebase Admin initialized successfully');
  console.log(`🔥 Connected to project: ${serviceAccount.project_id}`);
} catch (error) {
  console.log('⚠️ Firebase Admin not initialized:', error.message);
  console.log('📝 Please add serviceAccountKey.json to the backend folder');
}

const db = firebaseApp ? admin.firestore(firebaseApp) : null;

// Firebase service for MeowChat
class FirebaseService {
  constructor() {
    this.isConnected = !!firebaseApp;
  }

  // Sync user from Meowgram to MeowChat (read-only)
  async syncUserFromMeowgram(uid) {
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }

    try {
      // Read user from your existing Meowgram users collection
      const userDoc = await db.collection('users').doc(uid).get();
      
      if (!userDoc.exists) {
        return null;
      }

      const meowgramUser = userDoc.data();
      
      // Map Meowgram user to MeowChat user format
      return {
        firebaseUid: uid,
        username: meowgramUser.username,
        email: meowgramUser.email,
        displayName: meowgramUser.displayName,
        profilePicture: meowgramUser.avatarUrl || '',
        bio: meowgramUser.bio || '',
        isFromMeowgram: true,
        followersCount: meowgramUser.followersCount || 0,
        followingCount: meowgramUser.followingCount || 0,
        postsCount: meowgramUser.postsCount || 0,
        onboardingComplete: meowgramUser.onboardingComplete || false,
        meowgramCreatedAt: meowgramUser.createdAt,
      };
    } catch (error) {
      console.error('Error syncing user from Meowgram:', error);
      throw error;
    }
  }

  // Get multiple users for chat participant selection
  async getMeowgramUsers(limit = 20) {
    if (!this.isConnected) {
      return [];
    }

    try {
      const usersSnapshot = await db.collection('users')
        .limit(limit)
        .get();

      return usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        isFromMeowgram: true
      }));
    } catch (error) {
      console.error('Error getting Meowgram users:', error);
      return [];
    }
  }

  // Search Meowgram users by username
  async searchMeowgramUsers(searchTerm) {
    if (!this.isConnected || !searchTerm) {
      return [];
    }

    try {
      // Note: This is a simple search. For better performance, 
      // consider using Algolia or similar for your production app
      const usersSnapshot = await db.collection('users')
        .where('username', '>=', searchTerm)
        .where('username', '<=', searchTerm + '\uf8ff')
        .limit(10)
        .get();

      return usersSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        isFromMeowgram: true
      }));
    } catch (error) {
      console.error('Error searching Meowgram users:', error);
      return [];
    }
  }

  // Verify Firebase token (for users logging in with Firebase)
  async verifyFirebaseToken(token) {
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }

    try {
      const decodedToken = await admin.auth(firebaseApp).verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying Firebase token:', error);
      throw error;
    }
  }

  // Store MeowChat specific data (separate from Meowgram)
  async storeChatData(collection, docId, data) {
    if (!this.isConnected) {
      throw new Error('Firebase not connected');
    }

    try {
      // Use a separate collection prefix for MeowChat data
      await db.collection(`meowchat_${collection}`).doc(docId).set(data);
    } catch (error) {
      console.error('Error storing chat data:', error);
      throw error;
    }
  }

  // Get chat messages from Firebase (optional alternative to MongoDB)
  async getChatMessages(chatId, limit = 50) {
    if (!this.isConnected) {
      return [];
    }

    try {
      const messagesSnapshot = await db.collection(`meowchat_messages`)
        .where('chatId', '==', chatId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting chat messages:', error);
      return [];
    }
  }
}

module.exports = new FirebaseService();