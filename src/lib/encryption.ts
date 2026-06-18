/**
 * Encryption utilities for sensitive data
 * Note: For production, encryption should be done server-side via Firebase Functions
 * This is a basic client-side encryption for development/testing
 */

// Simple encryption key (in production, this should be stored securely on backend)
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'itemile-encryption-key-2026';

/**
 * Simple encryption using base64 encoding (for development)
 * In production, use proper encryption via Firebase Functions
 */
export const encryptSensitiveData = (data: string): string => {
  if (!data) return '';
  try {
    // Simple obfuscation - in production, use proper encryption
    const encoded = btoa(data + ENCRYPTION_KEY);
    return encoded;
  } catch (error) {
    console.error('Encryption error:', error);
    return data; // Fallback to plain text if encryption fails
  }
};

/**
 * Simple decryption (for development)
 * In production, use proper decryption via Firebase Functions
 */
export const decryptSensitiveData = (encrypted: string): string => {
  if (!encrypted) return '';
  try {
    const decoded = atob(encrypted);
    return decoded.replace(ENCRYPTION_KEY, '');
  } catch (error) {
    console.error('Decryption error:', error);
    return encrypted; // Fallback if decryption fails
  }
};

/**
 * Mask sensitive data for UI display
 */
export const maskAccountNumber = (accountNumber: string | undefined): string => {
  if (!accountNumber) return 'Not set';
  if (accountNumber.length <= 4) return '****';
  return '****' + accountNumber.slice(-4);
};

export const maskUPI = (upiId: string | undefined): string => {
  if (!upiId) return 'Not set';
  const parts = upiId.split('@');
  if (parts.length !== 2) return '****@****';
  return '****@' + parts[1];
};

export const maskPhone = (phone: string | undefined): string => {
  if (!phone) return 'Not set';
  if (phone.length <= 4) return '****';
  return phone.slice(0, 2) + '****' + phone.slice(-2);
};

/**
 * Validate UPI ID format
 */
export const isValidUPI = (upiId: string): boolean => {
  const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  return upiRegex.test(upiId);
};

/**
 * Validate IFSC code format
 */
export const isValidIFSC = (ifsc: string): boolean => {
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifsc);
};

/**
 * Validate bank account number (basic validation)
 */
export const isValidAccountNumber = (accountNumber: string): boolean => {
  // Account numbers are typically 9-18 digits
  const accountRegex = /^\d{9,18}$/;
  return accountRegex.test(accountNumber);
};

