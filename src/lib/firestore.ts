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
  // KYC fields
  aadharFrontUrl?: string;
  aadharBackUrl?: string;
  panUrl?: string;
  selfieUrl?: string;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  submittedAt?: any;
  verifiedAt?: any;
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
  type: 'rental_request' | 'swap_proposal' | 'message' | 'transaction_update' | 'verification_approved' | 'verification_rejected' | 'request_match' | 'new_request_nearby';
  transactionId?: string;
  requestId?: string;
  message: string;
  createdAt: any;
  read: boolean;
}

export interface EmailNotification {
  id?: string;
  email: string;
  subject: string;
  message: string;
  type: 'rental_request' | 'message' | 'verification_approved' | 'verification_rejected';
  read?: boolean;
  createdAt: any;
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
  requestId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export interface Request {
  id: string;
  userId: string;
  itemName: string;
  description: string;
  location: GeoPoint;
  duration: number; // in days
  maxBudget?: number; // optional budget limit
  category: string;
  matched: boolean;
  matchedAt?: any;
  matchedWith?: string; // userId who responded
  createdAt: any;
}


// User functions
export const createUser = async (userData: Omit<User, 'uid' | 'createdAt'>): Promise<void> => {
  const userRef = doc(db, 'users', userData.uid);

  // Read current doc to avoid overwriting verified=true back to false on sign-in
  const existingSnap = await getDoc(userRef);

  // Determine verified flag safely:
  // - If user already exists, preserve existing 'verified' value
  // - If new user, default to provided value or false
  const existingVerified = existingSnap.exists() ? (existingSnap.data() as any).verified : undefined;
  const safeVerified = existingVerified !== undefined
    ? existingVerified
    : (userData as any).verified ?? false;

  const payload = {
    ...userData,
    verified: safeVerified,
    createdAt: existingSnap.exists() ? (existingSnap.data() as any).createdAt ?? serverTimestamp() : serverTimestamp()
  } as any;

  await setDoc(userRef, payload, { merge: true });
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
  
  const chatData: any = {
    chatId,
    participants,
    lastMessage: '',
    lastUpdated: serverTimestamp(),
  };

  // Only add optional fields if they are defined
  if (listingTitle !== undefined) {
    chatData.listingTitle = listingTitle;
  }
  if (listingId !== undefined) {
    chatData.listingId = listingId;
  }
  
  await setDoc(chatRef, chatData, { merge: true });
};

// Helper function to create a chat between two users
export const createChat = async (chatId: string, uid1: string, uid2: string, listingTitle?: string, listingId?: string, requestId?: string): Promise<void> => {
  console.log('createChat called with:', { chatId, uid1, uid2, listingTitle, listingId, requestId });
  
  const chatData: any = {
    chatId,
    participants: [uid1, uid2],
    lastMessage: '',
    lastUpdated: serverTimestamp(),
  };

  // Only add optional fields if they are defined
  if (listingTitle !== undefined) {
    chatData.listingTitle = listingTitle;
  }
  if (listingId !== undefined) {
    chatData.listingId = listingId;
  }
  if (requestId !== undefined) {
    chatData.requestId = requestId;
    console.log('Adding requestId to chat data:', requestId);
  }
  
  console.log('Final chat data being saved:', chatData);
  await setDoc(doc(db, 'chats', chatId), chatData);
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

// Function to find a chat by requestId (with user authorization check)
export const getChatByRequestId = async (requestId: string, userId?: string): Promise<Chat | null> => {
  try {
    console.log('getChatByRequestId called with:', { requestId, userId });
    
    // First get the request to check authorization
    const request = await getRequest(requestId);
    if (!request) {
      console.error('Request not found:', requestId);
      return null;
    }

    console.log('Found request:', request);

    // If userId is provided, check if user is authorized (either requester or matched user)
    if (userId && request.userId !== userId && request.matchedWith !== userId) {
      console.error('User not authorized to access this chat', {
        userId,
        requestUserId: request.userId,
        requestMatchedWith: request.matchedWith
      });
      return null;
    }

    // Use getChatsByUser which works with security rules, then filter by requestId
    if (userId) {
      const userChats = await getChatsByUser(userId);
      console.log('User chats found:', userChats.length);
      console.log('Looking for requestId:', requestId, 'in chats:', userChats.map(c => ({ id: c.id, requestId: c.requestId })));
      console.log('Full chat details:', userChats.map(c => ({ 
        id: c.id, 
        requestId: c.requestId, 
        participants: c.participants,
        listingTitle: c.listingTitle 
      })));
      
      const matchingChat = userChats.find(chat => chat.requestId === requestId);
      console.log('Matching chat found:', matchingChat ? matchingChat.id : 'none');
      
      if (matchingChat) {
        return matchingChat;
      }
      
      // If no chat found by requestId, it might be a timing issue or the requestId field wasn't set
      // Let's try to find any chat between the requester and this user that might be for this request
      console.log('No chat found by requestId, trying fallback approach...');
      const otherUserId = request.userId === userId ? request.matchedWith : request.userId;
      console.log('Looking for chat between users:', userId, 'and', otherUserId);
      
      if (otherUserId) {
        // First try: find chat with the other user that has requestId (might be null/undefined but chat exists)
        let fallbackChat = userChats.find(chat => 
          chat.participants.includes(otherUserId) && 
          chat.requestId === requestId
        );
        
        if (fallbackChat) {
          console.log('Found chat via requestId fallback:', fallbackChat.id);
          return fallbackChat;
        }
        
        // Second try: find any chat with the other user that has a listingTitle matching the request
        fallbackChat = userChats.find(chat => 
          chat.participants.includes(otherUserId) && 
          chat.listingTitle && 
          chat.listingTitle.includes(request.itemName)
        );
        
        if (fallbackChat) {
          console.log('Found chat via listingTitle fallback:', fallbackChat.id);
          return fallbackChat;
        }
        
        // Third try: find the most recent chat with the other user (likely to be the request chat)
        const recentChats = userChats
          .filter(chat => chat.participants.includes(otherUserId))
          .sort((a, b) => {
            const aTime = a.lastUpdated?.toDate ? a.lastUpdated.toDate().getTime() : 0;
            const bTime = b.lastUpdated?.toDate ? b.lastUpdated.toDate().getTime() : 0;
            return bTime - aTime;
          });
          
        if (recentChats.length > 0) {
          console.log('Found most recent chat with other user:', recentChats[0].id);
          return recentChats[0];
        }
      }
      
      return null;
    } else {
      // Fallback: try direct query if no userId provided (less secure but sometimes needed)
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('requestId', '==', requestId));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      const chatDoc = querySnapshot.docs[0];
      return { id: chatDoc.id, ...chatDoc.data() } as Chat;
    }
  } catch (error) {
    console.error('Error finding chat by requestId:', error);
    return null;
  }
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

// KYC Functions
export const submitKYCDocuments = async (uid: string, documents: {
  aadharFrontUrl: string;
  aadharBackUrl: string;
  panUrl: string;
  selfieUrl?: string;
}): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...documents,
    verificationStatus: 'pending',
    submittedAt: serverTimestamp()
  });
};

export const getPendingKYCVerifications = async (): Promise<User[]> => {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('verificationStatus', '==', 'pending'),
    orderBy('submittedAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  })) as User[];
};

export const approveKYCVerification = async (uid: string): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    verified: true,
    verificationStatus: 'approved',
    verifiedAt: serverTimestamp(),
    rejectionReason: ''
  });
  
  // Get user email for notification
  const user = await getUser(uid);
  if (user) {
    // Create in-app notification
    await createNotification({
      userId: uid,
      type: 'verification_approved',
      message: 'Your verification has been approved! You can now access all features.',
      read: false
    });
    
    // Create email notification
    await sendEmailNotification({
      email: user.email,
      subject: 'Verification Approved ✅ - Rent Share',
      message: `Hi ${user.name},\n\nGreat news! Your verification has been approved. You now have full access to all Rent Share features.\n\nThank you for verifying your identity.\n\nBest regards,\nRent Share Team`,
      type: 'verification_approved',
      createdAt: serverTimestamp()
    });
  }
};

export const rejectKYCVerification = async (uid: string, reason: string): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    verified: false,
    verificationStatus: 'rejected',
    rejectionReason: reason,
    verifiedAt: serverTimestamp()
  });
  
  // Get user email for notification
  const user = await getUser(uid);
  if (user) {
    // Create in-app notification
    await createNotification({
      userId: uid,
      type: 'verification_rejected',
      message: `Your verification was rejected: ${reason}. Please re-upload your documents.`,
      read: false
    });
    
    // Create email notification
    await sendEmailNotification({
      email: user.email,
      subject: 'Verification Failed - Action Required - Rent Share',
      message: `Hi ${user.name},\n\nUnfortunately, your verification could not be approved.\n\nReason: ${reason}\n\nPlease re-upload your documents in your profile section.\n\nIf you have any questions, contact us at rentshare11@gmail.com.\n\nBest regards,\nRent Share Team`,
      type: 'verification_rejected',
      createdAt: serverTimestamp()
    });
  }
};

// Email Notification Functions
export const sendEmailNotification = async (emailData: Omit<EmailNotification, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'email_notifications'), emailData);
  return docRef.id;
};

// Request functions
export const createRequest = async (requestData: Omit<Request, 'id' | 'createdAt' | 'matched'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'requests'), {
    ...requestData,
    matched: false,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getRequests = async (): Promise<Request[]> => {
  const requestsRef = collection(db, 'requests');
  const q = query(requestsRef, where('matched', '==', false));
  const querySnapshot = await getDocs(q);
  
  const requests = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Request[];
  
  // Sort by createdAt in descending order on the client side
  return requests.sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    const aTime = a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
    const bTime = b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
};

export const getRequestsByUser = async (userId: string): Promise<Request[]> => {
  const requestsRef = collection(db, 'requests');
  const q = query(requestsRef, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  const requests = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Request[];
  
  // Sort by createdAt in descending order on the client side
  return requests.sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    const aTime = a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
    const bTime = b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
};

export const getAllRequests = async (): Promise<Request[]> => {
  const requestsRef = collection(db, 'requests');
  const querySnapshot = await getDocs(requestsRef);
  
  const requests = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Request[];
  
  // Sort by createdAt in descending order on the client side
  return requests.sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0;
    const aTime = a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
    const bTime = b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
};

export const getRequest = async (requestId: string): Promise<Request | null> => {
  const requestRef = doc(db, 'requests', requestId);
  const requestSnap = await getDoc(requestRef);
  return requestSnap.exists() ? { id: requestId, ...requestSnap.data() } as Request : null;
};

export const updateRequest = async (requestId: string, updates: Partial<Request>): Promise<void> => {
  const requestRef = doc(db, 'requests', requestId);
  await updateDoc(requestRef, updates);
};

export const markRequestAsMatched = async (requestId: string, matchedWith: string): Promise<void> => {
  const requestRef = doc(db, 'requests', requestId);
  await updateDoc(requestRef, {
    matched: true,
    matchedAt: serverTimestamp(),
    matchedWith
  });
};

export const deleteRequest = async (requestId: string, userId: string): Promise<void> => {
  // First get the request to verify user is the owner
  const request = await getRequest(requestId);
  if (!request) {
    throw new Error('Request not found');
  }
  
  if (request.userId !== userId) {
    throw new Error('Unauthorized to delete this request');
  }
  
  const requestRef = doc(db, 'requests', requestId);
  await deleteDoc(requestRef);
};

// Function to find nearby users for request notifications
export const getNearbyUsers = async (location: GeoPoint, radiusKm: number = 10): Promise<User[]> => {
  // Note: Firestore doesn't support native geo queries, so we'll use a simpler approach
  // In a production app, you might want to use a service like Algolia or implement
  // a grid-based system for location queries
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('verified', '==', true));
  const querySnapshot = await getDocs(q);
  
  const users = querySnapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  })) as User[];
  
  // Filter by distance (simplified calculation)
  const filteredUsers = users.filter(user => {
    if (!user.location) return false;
    
    const userLat = user.location.latitude;
    const userLng = user.location.longitude;
    const requestLat = location.latitude;
    const requestLng = location.longitude;
    
    // Simple distance calculation (in km)
    const distance = Math.sqrt(
      Math.pow(userLat - requestLat, 2) + Math.pow(userLng - requestLng, 2)
    ) * 111; // Rough conversion to km
    
    return distance <= radiusKm;
  });
  
  return filteredUsers;
};

// Function to notify nearby users about new requests
export const notifyNearbyUsersAboutRequest = async (request: Request): Promise<void> => {
  try {
    const nearbyUsers = await getNearbyUsers(request.location);
    
    // Filter out the user who made the request
    const usersToNotify = nearbyUsers.filter(user => user.uid !== request.userId);
    
    // Create notifications for each nearby user
    const batch = writeBatch(db);
    
    for (const user of usersToNotify.slice(0, 50)) { // Limit to 50 notifications to avoid spam
      const notificationRef = doc(collection(db, 'notifications'));
      batch.set(notificationRef, {
        userId: user.uid,
        type: 'new_request_nearby',
        requestId: request.id,
        message: `Someone near you is looking for "${request.itemName}" - earn money by renting yours!`,
        read: false,
        createdAt: serverTimestamp()
      });
    }
    
    await batch.commit();
  } catch (error) {
    console.error('Error notifying nearby users about request:', error);
  }
};

