// Emergency fix for verification mismatch
// Run this in browser console

import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export async function fixVerificationStatus() {
  if (!auth.currentUser) {
    console.error('❌ No user logged in');
    return;
  }

  try {
    const userId = auth.currentUser.uid;
    console.log('🔧 Fixing verification for user:', userId);
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      verified: true,
      verificationStatus: 'approved'
    });
    
    console.log('✅ Verification fixed! Reload the page.');
    window.location.reload();
  } catch (error) {
    console.error('❌ Error fixing verification:', error);
  }
}

// Auto-run if in browser console
if (typeof window !== 'undefined') {
  (window as any).fixVerificationStatus = fixVerificationStatus;
  console.log('💡 Run: fixVerificationStatus() to fix verification');
}

