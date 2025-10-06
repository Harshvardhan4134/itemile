// Quick cache clear utility
// Paste this in browser console (F12) to force refresh user data

async function forceRefreshUserData() {
  console.log('🔄 Force refreshing user data...');
  
  // Clear localStorage
  const authKeys = Object.keys(localStorage).filter(key => 
    key.includes('firebase') || key.includes('auth')
  );
  console.log('📦 Clearing localStorage keys:', authKeys);
  
  // Force reload from Firestore
  const { auth, db } = await import('./src/lib/firebase');
  const { getDoc, doc } = await import('firebase/firestore');
  
  if (auth.currentUser) {
    console.log('👤 Current user:', auth.currentUser.email);
    
    // Force token refresh
    await auth.currentUser.getIdToken(true);
    console.log('✅ Token refreshed');
    
    // Fetch fresh user data
    const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
    const userData = userDoc.data();
    console.log('📄 Fresh user data:', userData);
    console.log('✅ Verified status:', userData.verified);
    
    // Reload page
    console.log('🔄 Reloading page...');
    window.location.reload();
  } else {
    console.log('❌ No user logged in');
  }
}

// Run it
forceRefreshUserData();

