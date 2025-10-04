import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  GeoPoint,
  DocumentData,
  QuerySnapshot,
  Unsubscribe,
  writeBatch,
  limit
} from 'firebase/firestore';
import { db } from './firebase';

// Types
export interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  verified: boolean;
  wallet: number;
  rating: number;
  createdAt: any;
  role?: 'rent' | 'swap' | 'both';
  idProofUrl?: string;
  profilePhotoUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface Listing {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  rentPerDay: number;
  swapAllowed: boolean;
  category: string;
  location: GeoPoint;
  images: string[];
  videoProof?: string;
  available: boolean;
  createdAt: any;
}

export interface Transaction {
  id: string;
  transactionId?: string;
  listingId?: string;
  listingTitle?: string;
  ownerId: string;
  renterId: string;
  type: 'rent' | 'swap';
  status: 'pending' | 'active' | 'completed' | 'disputed' | 'PENDING';
  startDate: any;
  endDate: any;
  amount: number;
  paymentMode: 'online' | 'offline';
  createdAt: any;
  updatedAt?: any;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'rental_request' | 'swap_proposal' | 'message' | 'transaction_update';
  transactionId?: string;
  message: string;
  createdAt: any;
  read: boolean;
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPhotoUrl?: string;
  revieweeId: string;
  transactionId: string;
  listingId: string;
  listingTitle: string;
  rating: number; // 1-5 stars
  comment: string;
  createdAt: any;
  updatedAt?: any;
}

export interface Chat {
  id: string;
  chatId: string;
  lastMessage: string;
  lastUpdated: any;
  participants: string[];
  transactionId?: string;
  listingTitle?: string;
  listingId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}


// User functions
export const createUser = async (userData: Omit<User, 'uid' | 'createdAt'>): Promise<void> => {
  const userRef = doc(db, 'users', userData.uid);
  await setDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp()
  }, { merge: true }); // merge: true creates doc if it doesn't exist, updates if it does
};

export const getUser = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? { uid, ...userSnap.data() } as User : null;
};

export const updateUser = async (uid: string, updates: Partial<User>): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, updates);
};

export const updateUserProfilePhoto = async (uid: string, profilePhotoUrl: string): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { profilePhotoUrl });
};

export const updateUserLocation = async (uid: string, latitude: number, longitude: number): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    location: {
      latitude,
      longitude
    }
  });
};

// Listing functions
export const createListing = async (listingData: Omit<Listing, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'listings'), {
    ...listingData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getListings = async (): Promise<Listing[]> => {
  const listingsRef = collection(db, 'listings');
  const q = query(listingsRef, where('available', '==', true), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Listing[];
};

export const getListingsByOwner = async (ownerId: string): Promise<Listing[]> => {
  const listingsRef = collection(db, 'listings');
  const q = query(listingsRef, where('ownerId', '==', ownerId), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Listing[];
};

export const getListing = async (listingId: string): Promise<Listing | null> => {
  const listingRef = doc(db, 'listings', listingId);
  const listingSnap = await getDoc(listingRef);
  return listingSnap.exists() ? { id: listingId, ...listingSnap.data() } as Listing : null;
};

export const updateListing = async (listingId: string, updates: Partial<Listing>): Promise<void> => {
  const listingRef = doc(db, 'listings', listingId);
  await updateDoc(listingRef, updates);
};

export const deleteListing = async (listingId: string, userId: string): Promise<void> => {
  // First get the listing to verify user is the owner
  const listing = await getListing(listingId);
  if (!listing) {
    throw new Error('Listing not found');
  }
  
  if (listing.ownerId !== userId) {
    throw new Error('Unauthorized to delete this listing');
  }
  
  const listingRef = doc(db, 'listings', listingId);
  await deleteDoc(listingRef);
};

// Transaction functions
export const createTransaction = async (transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'transactions'), {
    ...transactionData,
    participants: [transactionData.ownerId, transactionData.renterId],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const getTransactionsByUser = async (userId: string): Promise<Transaction[]> => {
  const transactionsRef = collection(db, 'transactions');
  const q = query(
    transactionsRef,
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Transaction[];
};

export const getTransactionsByRenter = async (renterId: string): Promise<Transaction[]> => {
  const transactionsRef = collection(db, 'transactions');
  const q = query(
    transactionsRef,
    where('renterId', '==', renterId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Transaction[];
};

// Get all transactions where user is either owner or renter
export const getAllTransactionsByUser = async (userId: string): Promise<Transaction[]> => {
  const transactionsRef = collection(db, 'transactions');
  
  // Query for transactions where user is owner
  const ownerQuery = query(
    transactionsRef,
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  // Query for transactions where user is renter
  const renterQuery = query(
    transactionsRef,
    where('renterId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  // Execute both queries
  const [ownerSnapshot, renterSnapshot] = await Promise.all([
    getDocs(ownerQuery),
    getDocs(renterQuery)
  ]);
  
  // Combine results and remove duplicates
  const allTransactions = [
    ...ownerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    ...renterSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  ] as Transaction[];
  
  // Remove duplicates and sort by createdAt
  const uniqueTransactions = allTransactions.filter((transaction, index, self) => 
    index === self.findIndex(t => t.id === transaction.id)
  );
  
  return uniqueTransactions.sort((a, b) => 
    b.createdAt?.toDate().getTime() - a.createdAt?.toDate().getTime()
  );
};

// Get transactions where user is either owner or renter (matches Firestore rules)
export const getTransactionsByParticipant = async (userId: string): Promise<Transaction[]> => {
  console.log('getTransactionsByParticipant called with userId:', userId);
  const transactionsRef = collection(db, 'transactions');
  
  // Query for transactions where user is owner
  const ownerQuery = query(
    transactionsRef,
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  // Query for transactions where user is renter
  const renterQuery = query(
    transactionsRef,
    where('renterId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  try {
    // Execute both queries
    const [ownerSnapshot, renterSnapshot] = await Promise.all([
      getDocs(ownerQuery),
      getDocs(renterQuery)
    ]);
    
    console.log('Owner transactions found:', ownerSnapshot.docs.length);
    console.log('Renter transactions found:', renterSnapshot.docs.length);
    
    // Combine results and remove duplicates
    const allTransactions = [
      ...ownerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      ...renterSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    ] as Transaction[];
    
    console.log('All transactions before deduplication:', allTransactions.length);
    
    // Remove duplicates and sort by createdAt
    const uniqueTransactions = allTransactions.filter((transaction, index, self) => 
      index === self.findIndex(t => t.id === transaction.id)
    );
    
    console.log('Unique transactions after deduplication:', uniqueTransactions.length);
    console.log('Transaction details:', uniqueTransactions);
    
    return uniqueTransactions.sort((a, b) => 
      b.createdAt?.toDate().getTime() - a.createdAt?.toDate().getTime()
    );
  } catch (error) {
    console.error('Error in getTransactionsByParticipant:', error);
    throw error;
  }
};

export const getTransaction = async (transactionId: string): Promise<Transaction | null> => {
  const transactionRef = doc(db, 'transactions', transactionId);
  const transactionSnap = await getDoc(transactionRef);
  return transactionSnap.exists() ? { id: transactionId, ...transactionSnap.data() } as Transaction : null;
};

export const updateTransaction = async (transactionId: string, updates: Partial<Transaction>): Promise<void> => {
  const transactionRef = doc(db, 'transactions', transactionId);
  await updateDoc(transactionRef, updates);
};

export const updateTransactionStatus = async (transactionId: string, status: string, userId: string): Promise<void> => {
  try {
    // First get the transaction to verify user has access
    const transaction = await getTransaction(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Check if user is owner or renter
    if (transaction.ownerId !== userId && transaction.renterId !== userId) {
      throw new Error('Unauthorized to update this transaction');
    }
    
    // Update the transaction status
    await updateTransaction(transactionId, { status: status as any });
    
    // Create notification for the other party
    const otherUserId = transaction.ownerId === userId ? transaction.renterId : transaction.ownerId;
    const action = status === 'active' ? 'approved' : status === 'declined' ? 'declined' : 'updated';
    
    await createNotification({
      userId: otherUserId,
      type: 'transaction_update',
      transactionId: transactionId,
      message: `Your rental request has been ${action}`,
      read: false
    });
    
  } catch (error) {
    console.error('Error updating transaction status:', error);
    throw error;
  }
};

export const deleteTransaction = async (transactionId: string, userId: string): Promise<void> => {
  try {
    // First get the transaction to verify user has access
    const transaction = await getTransaction(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Check if user is owner or renter
    if (transaction.ownerId !== userId && transaction.renterId !== userId) {
      throw new Error('Unauthorized to delete this transaction');
    }
    
    // Delete the transaction
    const transactionRef = doc(db, 'transactions', transactionId);
    await deleteDoc(transactionRef);
    
    // Also delete associated chat if it exists
    try {
      const chat = await getChatByTransactionId(transactionId, userId);
      if (chat) {
        const chatRef = doc(db, 'chats', chat.id);
        await deleteDoc(chatRef);
      }
    } catch (error) {
      console.log('No associated chat found or error deleting chat:', error);
    }
    
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

// Transaction-based message functions (legacy)
export const sendTransactionMessage = async (transactionId: string, messageData: Omit<Message, 'id' | 'createdAt'>): Promise<void> => {
  const messagesRef = collection(db, 'transactions', transactionId, 'messages');
  await addDoc(messagesRef, {
    ...messageData,
    createdAt: serverTimestamp()
  });
};

export const subscribeToTransactionMessages = (
  transactionId: string,
  callback: (messages: Message[]) => void
): Unsubscribe => {
  const messagesRef = collection(db, 'transactions', transactionId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Message[];
    callback(messages);
  });
};

// Simplified chat functions
export const ensureChat = async (
  chatId: string, 
  participants: string[], 
  listingTitle?: string, 
  listingId?: string
): Promise<void> => {
  const chatRef = doc(db, 'chats', chatId);
  
  await setDoc(chatRef, {
    chatId,
    participants,
    lastMessage: '',
    lastUpdated: serverTimestamp(),
    listingTitle,
    listingId,
  }, { merge: true });
};

// Helper function to create a chat between two users
export const createChat = async (chatId: string, uid1: string, uid2: string, listingTitle?: string, listingId?: string): Promise<void> => {
  await setDoc(doc(db, 'chats', chatId), {
    chatId,
    participants: [uid1, uid2],
    lastMessage: '',
    lastUpdated: serverTimestamp(),
    listingTitle,
    listingId,
  });
};

export const sendMessage = async (chatId: string, senderId: string, text: string): Promise<void> => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const chatRef = doc(db, 'chats', chatId);
  
  // Add message
  await addDoc(messagesRef, {
    senderId,
    text,
    createdAt: serverTimestamp(),
  });
  
  // Update chat metadata
  await updateDoc(chatRef, {
    lastMessage: text,
    lastUpdated: serverTimestamp(),
  });
};

export const subscribeToMessages = (
  chatId: string,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatMessage[];
    callback(messages);
  });
};

export const getChatsByUser = async (userId: string): Promise<Chat[]> => {
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef,
    where('participants', 'array-contains', userId),
    orderBy('lastUpdated', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Chat[];
};

export const getChat = async (chatId: string): Promise<Chat | null> => {
  const chatRef = doc(db, 'chats', chatId);
  const chatSnap = await getDoc(chatRef);
  return chatSnap.exists() ? { id: chatId, ...chatSnap.data() } as Chat : null;
};

// Helper function to find existing chat between two users for a listing
const findExistingChat = async (ownerId: string, renterId: string, listingId: string): Promise<string | null> => {
  try {
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", ownerId),
      where("listingId", "==", listingId)
    );
    
    const snapshot = await getDocs(q);
    
    for (const doc of snapshot.docs) {
      const chatData = doc.data();
      if (chatData.participants.includes(renterId) && chatData.participants.includes(ownerId)) {
        return doc.id;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding existing chat:', error);
    return null;
  }
};

// Transaction + Chat creation function
export const createTransactionAndChat = async (listing: any, renterId: string): Promise<{transactionId: string, chatId: string}> => {
  // First, check if there's already a chat between these users for this listing
  const existingChatId = await findExistingChat(listing.ownerId, renterId, listing.id);
  
  if (existingChatId) {
    console.log('Found existing chat:', existingChatId);
    
    // Check if there's already a transaction for this listing and renter
    const transactionQuery = query(
      collection(db, "transactions"),
      where("listingId", "==", listing.id),
      where("renterId", "==", renterId),
      where("ownerId", "==", listing.ownerId)
    );
    
    const transactionSnapshot = await getDocs(transactionQuery);
    
    if (!transactionSnapshot.empty) {
      const existingTransaction = transactionSnapshot.docs[0];
      console.log('Found existing transaction:', existingTransaction.id);
      return { 
        transactionId: existingTransaction.id, 
        chatId: existingChatId 
      };
    }
  }

  const transactionId = `txn_${listing.id}_${renterId}_${Date.now()}`;
  const chatId = existingChatId || `chat_${listing.ownerId}_${renterId}_${Date.now()}`;

  console.log('Creating transaction and chat:', {
    transactionId,
    chatId,
    listingId: listing.id,
    ownerId: listing.ownerId,
    renterId,
    listingTitle: listing.title,
    isNewChat: !existingChatId
  });

  // Step 1: Create Transaction
  const transactionData = {
    transactionId,
    listingId: listing.id,
    listingTitle: listing.title,
    ownerId: listing.ownerId,
    renterId,
    status: "pending",
    type: 'rent',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days later
    amount: listing.rentPerDay || 0,
    paymentMode: 'online',
    createdAt: serverTimestamp(),
  };

  console.log('Transaction data to be saved:', transactionData);
  await setDoc(doc(db, "transactions", transactionId), transactionData);
  console.log('Transaction created successfully');

  // Step 2: Create Chat linked to this transaction (only if it's a new chat)
  if (!existingChatId) {
    const chatData = {
      chatId,
      participants: [listing.ownerId, renterId],
      transactionId,
      listingId: listing.id,
      listingTitle: listing.title,
      lastMessage: "",
      lastUpdated: serverTimestamp(),
    };

    console.log('Chat data to be saved:', chatData);
    await setDoc(doc(db, "chats", chatId), chatData);
    console.log('Chat created successfully');
  } else {
    // Update existing chat with transaction reference
    await updateDoc(doc(db, "chats", chatId), {
      transactionId,
      lastUpdated: serverTimestamp(),
    });
    console.log('Existing chat updated with transaction reference');
  }

  return { transactionId, chatId };
};

// Notification functions
export const createNotification = async (notificationData: Omit<Notification, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'notifications'), {
    ...notificationData,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getNotificationsByUser = async (userId: string): Promise<Notification[]> => {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Notification[];
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const notificationRef = doc(db, 'notifications', notificationId);
  await updateDoc(notificationRef, {
    read: true
  });
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.size;
};

export const subscribeToNotifications = (userId: string, callback: (count: number) => void): Unsubscribe => {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    where('read', '==', false)
  );
  
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
};

// Chat message functions
export const sendChatMessage = async (chatId: string, senderId: string, text: string): Promise<void> => {
  // Add message to chat
  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId,
    text,
    createdAt: serverTimestamp(),
  });

  // Update last message in chat
  await setDoc(doc(db, "chats", chatId), {
    lastMessage: text,
    lastUpdated: serverTimestamp(),
  }, { merge: true });
};

export const subscribeToChatMessages = (chatId: string, callback: (messages: Message[]) => void): Unsubscribe => {
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));
  
  return onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Message[];
    callback(messages);
  });
};

export const subscribeToChats = (currentUserId: string, callback: (chats: Chat[]) => void): Unsubscribe => {
  const q = query(
    collection(db, "chats"), 
    where("participants", "array-contains", currentUserId),
    orderBy("lastUpdated", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    })) as Chat[];
    callback(chats);
  });
};

export const getChatByTransactionId = async (transactionId: string, userId?: string): Promise<Chat | null> => {
  try {
    // First get the transaction to verify user has access
    const transaction = await getTransaction(transactionId);
    if (!transaction) {
      return null;
    }
    
    // Check if user is owner or renter
    if (userId && transaction.ownerId !== userId && transaction.renterId !== userId) {
      return null;
    }
    
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('transactionId', '==', transactionId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const chatDoc = querySnapshot.docs[0];
    const chatData = chatDoc.data();
    
    return {
      id: chatDoc.id,
      ...chatData
    } as Chat;
  } catch (error) {
    console.error('Error getting chat by transaction ID:', error);
    return null;
  }
};

// Review functions
export const createReview = async (reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'reviews'), {
    ...reviewData,
    createdAt: serverTimestamp()
  });
  
  // Update user's average rating
  await updateUserRating(reviewData.revieweeId);
  
  return docRef.id;
};

export const getReviewsByUser = async (userId: string): Promise<Review[]> => {
  const reviewsRef = collection(db, 'reviews');
  const q = query(
    reviewsRef,
    where('revieweeId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Review[];
};

export const getReviewByTransaction = async (transactionId: string, reviewerId: string): Promise<Review | null> => {
  const reviewsRef = collection(db, 'reviews');
  const q = query(
    reviewsRef,
    where('transactionId', '==', transactionId),
    where('reviewerId', '==', reviewerId)
  );
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const reviewDoc = querySnapshot.docs[0];
  return {
    id: reviewDoc.id,
    ...reviewDoc.data()
  } as Review;
};

export const updateReview = async (reviewId: string, reviewData: Partial<Review>): Promise<void> => {
  const reviewRef = doc(db, 'reviews', reviewId);
  await updateDoc(reviewRef, {
    ...reviewData,
    updatedAt: serverTimestamp()
  });
  
  // Get the review to update user rating
  const reviewDoc = await getDoc(reviewRef);
  if (reviewDoc.exists()) {
    const review = reviewDoc.data() as Review;
    await updateUserRating(review.revieweeId);
  }
};

export const deleteReview = async (reviewId: string): Promise<void> => {
  const reviewRef = doc(db, 'reviews', reviewId);
  const reviewDoc = await getDoc(reviewRef);
  
  if (reviewDoc.exists()) {
    const review = reviewDoc.data() as Review;
    await deleteDoc(reviewRef);
    
    // Update user's average rating after deletion
    await updateUserRating(review.revieweeId);
  }
};

export const updateUserRating = async (userId: string): Promise<void> => {
  try {
    const reviews = await getReviewsByUser(userId);
    
    if (reviews.length === 0) {
      // If no reviews, set rating to 0
      await updateDoc(doc(db, 'users', userId), {
        rating: 0
      });
      return;
    }
    
    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;
    
    // Update user's rating
    await updateDoc(doc(db, 'users', userId), {
      rating: Math.round(averageRating * 10) / 10 // Round to 1 decimal place
    });
  } catch (error) {
    console.error('Error updating user rating:', error);
  }
};

export const canUserReview = async (transactionId: string, userId: string): Promise<boolean> => {
  try {
    // Check if transaction exists and is completed
    const transaction = await getTransaction(transactionId);
    if (!transaction || transaction.status !== 'completed') {
      return false;
    }
    
    // Check if user is part of the transaction
    if (transaction.ownerId !== userId && transaction.renterId !== userId) {
      return false;
    }
    
    // Check if user has already reviewed
    const existingReview = await getReviewByTransaction(transactionId, userId);
    return !existingReview;
  } catch (error) {
    console.error('Error checking if user can review:', error);
    return false;
  }
};

