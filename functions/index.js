// Use the v1 compatibility API so that functions.firestore.document(...) works with firebase-functions v7
const functions = require("firebase-functions/v1");
const { defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const Razorpay = require("razorpay");
const crypto = require("crypto");

admin.initializeApp();

// Define environment parameters
const emailUser = defineString("EMAIL_USER", { default: "lendlly2025@gmail.com" });
// NOTE: For simplicity, we use defineString for EMAIL_PASSWORD instead of a Secret,
// so we don't need functions.runWith(). This avoids the runWith() error you're seeing.
const emailPassword = defineString("EMAIL_PASSWORD");
const appUrl = defineString("APP_URL", { default: "https://lendlly.vercel.app" });

// Razorpay configuration
// Using functions.config() for v1 compatibility
// Set via: firebase functions:config:set razorpay.key_id="..." razorpay.key_secret="..."
// Note: Remove the old defineString lines if they exist

// Configure your email transport
// IMPORTANT: Replace with your actual email credentials
// For Gmail, you need to create an "App Password" at https://myaccount.google.com/apppasswords
const getTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUser.value(),
      pass: emailPassword.value(),
    },
  });
};

/**
 * Cloud Function: Send Email Notifications
 * Triggers when a new document is created in the email_notifications collection
 */
exports.sendEmailNotification = functions.firestore
    .document("email_notifications/{notificationId}")
    .onCreate(async (snap, context) => {
      const data = snap.data();
      const transporter = getTransporter();

      const mailOptions = {
        from: `Lendlly <${emailUser.value()}>`,
        to: data.email,
        subject: data.subject,
        text: data.message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4f46e5; margin: 0; font-size: 28px;">Rent Share</h1>
                <p style="color: #6b7280; margin-top: 5px;">Peer-to-Peer Rental Platform</p>
              </div>
              
              <div style="border-left: 4px solid #4f46e5; padding-left: 20px; margin: 20px 0;">
                <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; color: #374151; line-height: 1.6; margin: 0;">${data.message}</pre>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
                <p style="margin: 5px 0;">Need help? Contact us at <a href="mailto:support@lendlly.in" style="color: #4f46e5; text-decoration: none;">support@lendlly.in</a></p>
                <p style="margin-top: 15px; color: #9ca3af; font-size: 12px;">© 2025 Rent Share. All rights reserved.</p>
              </div>
            </div>
          </div>
        `,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${data.email}`);

        // Optionally, mark the notification as sent
        await snap.ref.update({
          sent: true,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return null;
      } catch (error) {
        console.error("Error sending email:", error);
        
        // Log the error in Firestore
        await snap.ref.update({
          sent: false,
          error: error.message,
          errorAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        throw new functions.https.HttpsError("internal", "Unable to send email");
      }
    });

/**
 * Cloud Function: Send notification on new rental request
 * Triggers when a new transaction is created
 */
exports.onTransactionCreated = functions.firestore
    .document("transactions/{transactionId}")
    .onCreate(async (snap, context) => {
      const transaction = snap.data();

      // Only send email for rental requests, not other transaction types
      if (transaction.status === "pending" && transaction.type === "rent") {
        try {
          // Get owner details
          const ownerDoc = await admin.firestore()
              .collection("users")
              .doc(transaction.ownerId)
              .get();

          const owner = ownerDoc.data();
          if (!owner || !owner.email) {
            console.log("Owner email not found");
            return null;
          }

          // Get renter details
          const renterDoc = await admin.firestore()
              .collection("users")
              .doc(transaction.renterId)
              .get();

          const renter = renterDoc.data();

          // Format booking dates if available
          let dateInfo = "";
          if (transaction.startDate && transaction.endDate) {
            const startDate = transaction.startDate.toDate ? transaction.startDate.toDate() : new Date(transaction.startDate);
            const endDate = transaction.endDate.toDate ? transaction.endDate.toDate() : new Date(transaction.endDate);
            const startFormatted = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const endFormatted = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            dateInfo = `\nDuration: ${transaction.days || transaction.months || 'N/A'} ${transaction.durationType || 'days'}\nStart Date: ${startFormatted}\nEnd Date: ${endFormatted}`;
          }

          // Format amount details
          let amountInfo = `Amount: ₹${transaction.amount || 0}`;
          if (transaction.totalRent) {
            amountInfo = `Total Rent: ₹${transaction.totalRent}`;
            if (transaction.deposit) {
              amountInfo += `\nDeposit: ₹${transaction.deposit}\nTotal Payable: ₹${(transaction.totalRent + transaction.deposit + (transaction.serviceFee || 0))}`;
            }
          }

          // Send email notification to owner
          await admin.firestore().collection("email_notifications").add({
            email: owner.email,
            subject: "New Booking Request! 🎉 - Rent Share",
            message: `Hi ${owner.name},\n\nYou've received a new booking request!\n\nListing: ${transaction.listingTitle}\nRequested by: ${renter?.name || "A user"}${dateInfo}\n${amountInfo}\n\nPlease review and respond to this request in your Rent Share dashboard.\n\nView Booking: ${appUrl.value()}/owner-bookings\n\nBest regards,\nRent Share Team`,
            type: "rental_request",
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          console.log(`Rental request email notification created for ${owner.email}`);
        } catch (error) {
          console.error("Error creating rental request notification:", error);
        }
      }

      return null;
    });

/**
 * Cloud Function: Send notification on new chat message
 * Triggers when a new message is added to a chat
 */
exports.onNewMessage = functions.firestore
    .document("chats/{chatId}/messages/{messageId}")
    .onCreate(async (snap, context) => {
      const message = snap.data();
      const chatId = context.params.chatId;

      try {
        // Get chat details
        const chatDoc = await admin.firestore()
            .collection("chats")
            .doc(chatId)
            .get();

        const chat = chatDoc.data();
        if (!chat) {
          console.log("Chat not found");
          return null;
        }

        // Find the recipient (the participant who didn't send the message)
        const recipientId = chat.participants.find((id) => id !== message.senderId);
        if (!recipientId) {
          console.log("Recipient not found");
          return null;
        }

        // Get recipient details
        const recipientDoc = await admin.firestore()
            .collection("users")
            .doc(recipientId)
            .get();

        const recipient = recipientDoc.data();
        if (!recipient || !recipient.email) {
          console.log("Recipient email not found");
          return null;
        }

        // Get sender details
        const senderDoc = await admin.firestore()
            .collection("users")
            .doc(message.senderId)
            .get();

        const sender = senderDoc.data();

        // Create in-app notification
        await admin.firestore().collection("notifications").add({
          userId: recipientId,
          type: "message",
          chatId: chatId,
          transactionId: chat.transactionId || undefined,
          listingId: chat.listingId || undefined,
          message: `Someone contacted you about "${chat.listingTitle || "an item"}"`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Send email notification
        await admin.firestore().collection("email_notifications").add({
          email: recipient.email,
          subject: `New message from ${sender?.name || "a user"} - Rent Share`,
          message: `Hi ${recipient.name},\n\nYou have a new message on Rent Share!\n\nFrom: ${sender?.name || "A user"}\nRegarding: ${chat.listingTitle || "Your listing"}\n\nMessage: "${message.text}"\n\nReply now: ${appUrl.value()}/chat/${chatId}\n\nBest regards,\nRent Share Team`,
          type: "message",
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Message notification created for ${recipient.email}`);
      } catch (error) {
        console.error("Error creating message notification:", error);
      }

      return null;
    });

/**
 * Cloud Function: Send OTP emails when pickup OTP is generated
 * Triggers when a transaction status changes to 'pickup_otp_generated'
 */
exports.onPickupOtpGenerated = functions.firestore
    .document("transactions/{transactionId}")
    .onUpdate(async (change, context) => {
      const before = change.before.data();
      const after = change.after.data();

      // Check if status changed to pickup_otp_generated
      if (before.status !== 'pickup_otp_generated' && after.status === 'pickup_otp_generated' && after.pickupOtp) {
        try {
          // Get renter and owner details
          const [renterDoc, ownerDoc] = await Promise.all([
            admin.firestore().collection("users").doc(after.renterId).get(),
            admin.firestore().collection("users").doc(after.ownerId).get()
          ]);

          const renter = renterDoc.data();
          const owner = ownerDoc.data();

          // Validate that we have the correct user data
          if (!renter) {
            console.error(`[Pickup OTP] Renter not found for ID: ${after.renterId}`);
          }
          if (!owner) {
            console.error(`[Pickup OTP] Owner not found for ID: ${after.ownerId}`);
          }

          // Send email to renter with their OTP
          if (renter?.email) {
            console.log(`[Pickup OTP] Sending email to RENTER: ${renter.email} (ID: ${after.renterId})`);
            await admin.firestore().collection("email_notifications").add({
              email: renter.email,
              subject: `Your Pickup OTP - ${after.listingTitle || 'Booking'}`,
              message: `Hi ${renter.name || 'there'},\n\nYour booking for "${after.listingTitle || 'the item'}" has been confirmed!\n\n📍 Your Pickup OTP: ${after.pickupOtp}\n\nPlease show this code to the owner when you collect the item.\n\nThis OTP is valid for 24 hours.\n\nBest regards,\nLendlly Team`,
              type: "rental_request",
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            console.error(`[Pickup OTP] Renter email not found for ID: ${after.renterId}`);
          }

          // Send email to owner with the OTP they should expect from renter
          if (owner?.email) {
            console.log(`[Pickup OTP] Sending email to OWNER: ${owner.email} (ID: ${after.ownerId})`);
            await admin.firestore().collection("email_notifications").add({
              email: owner.email,
              subject: `Pickup OTP Generated - ${after.listingTitle || 'Booking'}`,
              message: `Hi ${owner.name},\n\nThe renter will show you this code at pickup: ${after.pickupOtp}\n\nOnly confirm the pickup after:\n1. Verifying the OTP matches\n2. Checking the item condition\n3. Capturing photos/videos of the item\n\nBest regards,\nLendlly Team`,
              type: "rental_request",
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            console.error(`[Pickup OTP] Owner email not found for ID: ${after.ownerId}`);
          }

          console.log(`Pickup OTP emails sent for transaction ${context.params.transactionId}`);
        } catch (error) {
          console.error("Error sending pickup OTP emails:", error);
        }
      }

      return null;
    });

/**
 * Cloud Function: Send OTP emails when return OTP is generated
 * Triggers when a transaction status changes to 'return_otp_generated'
 */
exports.onReturnOtpGenerated = functions.firestore
    .document("transactions/{transactionId}")
    .onUpdate(async (change, context) => {
      const before = change.before.data();
      const after = change.after.data();

      // Check if status changed to return_otp_generated
      if (before.status !== 'return_otp_generated' && after.status === 'return_otp_generated' && after.returnOtp) {
        try {
          // Get renter and owner details
          const [renterDoc, ownerDoc] = await Promise.all([
            admin.firestore().collection("users").doc(after.renterId).get(),
            admin.firestore().collection("users").doc(after.ownerId).get()
          ]);

          const renter = renterDoc.data();
          const owner = ownerDoc.data();

          // Validate that we have the correct user data
          if (!renter) {
            console.error(`[Return OTP] Renter not found for ID: ${after.renterId}`);
          }
          if (!owner) {
            console.error(`[Return OTP] Owner not found for ID: ${after.ownerId}`);
          }

          // Send email to renter with their OTP
          if (renter?.email) {
            console.log(`[Return OTP] Sending email to RENTER: ${renter.email} (ID: ${after.renterId})`);
            await admin.firestore().collection("email_notifications").add({
              email: renter.email,
              subject: `Your Return OTP - ${after.listingTitle || 'Booking'}`,
              message: `Hi ${renter.name || 'there'},\n\nThe rental period for "${after.listingTitle || 'the item'}" is ending soon.\n\n📍 Your Return OTP: ${after.returnOtp}\n\nPlease share this code with the owner when you return the item. Only share it after you're satisfied with the item condition.\n\nThis OTP is valid for 7 days.\n\nBest regards,\nLendlly Team`,
              type: "rental_request",
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            console.error(`[Return OTP] Renter email not found for ID: ${after.renterId}`);
          }

          // Send email to owner with the OTP they should expect from renter
          if (owner?.email) {
            console.log(`[Return OTP] Sending email to OWNER: ${owner.email} (ID: ${after.ownerId})`);
            await admin.firestore().collection("email_notifications").add({
              email: owner.email,
              subject: `Return OTP for ${after.listingTitle || 'Booking'}`,
              message: `Hi ${owner.name},\n\nThe rental period for "${after.listingTitle || 'your item'}" is ending soon.\n\n📍 Return OTP: ${after.returnOtp}\n\nAsk the renter for this code when they return the item. Only confirm after verifying the item condition and capturing photos.\n\nBest regards,\nLendlly Team`,
              type: "rental_request",
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            console.error(`[Return OTP] Owner email not found for ID: ${after.ownerId}`);
          }

          console.log(`Return OTP emails sent for transaction ${context.params.transactionId}`);
        } catch (error) {
          console.error("Error sending return OTP emails:", error);
        }
      }

      return null;
    });

/**
 * Cloud Function: Create Razorpay Route Account for Owner
 * Creates a Razorpay Route account (sub-merchant) for an owner
 */
exports.createRazorpayRouteAccount = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to create route account"
      );
    }

    const { name, email, phone, bankAccountNumber, ifscCode, accountHolderName } = data;

    // Validate input
    if (!name || !email || !phone) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Name, email, and phone are required"
      );
    }

    // Get Razorpay credentials
    const config = functions.config();
    const keyId = config?.razorpay?.key_id;
    const keySecret = config?.razorpay?.key_secret;

    if (!keyId || !keySecret) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Razorpay credentials not configured"
      );
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Create Route account (sub-merchant)
    const accountData = {
      email: email,
      phone: phone,
      legal_business_name: name,
      business_type: "individual", // or "partnership", "private_limited", etc.
      contact_name: name,
      profile: {
        category: "services",
        subcategory: "rental_services",
        description: "Peer-to-peer rental marketplace",
      },
    };

    // Add bank account if provided
    if (bankAccountNumber && ifscCode && accountHolderName) {
      accountData.bank_account = {
        name: accountHolderName,
        account_number: bankAccountNumber,
        ifsc: ifscCode,
      };
    }

    const account = await razorpay.accounts.create(accountData);

    // Store account ID in Firestore
    await admin.firestore()
      .collection("users")
      .doc(context.auth.uid)
      .update({
        razorpayAccountId: account.id,
        razorpayAccountStatus: account.status,
        razorpayAccountCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {
      success: true,
      accountId: account.id,
      status: account.status,
    };
  } catch (error) {
    console.error("Error creating Razorpay route account:", error);
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to create route account"
    );
  }
});

/**
 * Cloud Function: Create Razorpay Order with Marketplace Split
 * Creates a Razorpay order with transfer rules for marketplace split
 */
exports.createRazorpayOrder = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to create payment order"
      );
    }

    const { 
      amount, 
      currency = "INR", 
      receipt,
      ownerId,
      rentAmount,
      serviceFee,
      depositAmount,
      transactionId
    } = data;

    // Validate input
    if (!amount || amount < 1) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Amount must be provided and greater than 0"
      );
    }

    if (!ownerId || !rentAmount || serviceFee === undefined) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "ownerId, rentAmount, and serviceFee are required for marketplace split"
      );
    }

    // Get Razorpay credentials
    const config = functions.config();
    const keyId = config?.razorpay?.key_id;
    const keySecret = config?.razorpay?.key_secret;
    const platformAccountId = config?.razorpay?.platform_account_id; // Your platform account ID

    if (!keyId || !keySecret) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Razorpay credentials not configured"
      );
    }

    // Get owner's Razorpay account ID
    const ownerDoc = await admin.firestore()
      .collection("users")
      .doc(ownerId)
      .get();

    if (!ownerDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Owner not found"
      );
    }

    const ownerData = ownerDoc.data();
    const ownerAccountId = ownerData?.razorpayAccountId;

    if (!ownerAccountId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Owner does not have a Razorpay account. Please create one first."
      );
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Build transfer rules for marketplace split
    const transfers = [
      {
        account: ownerAccountId, // Owner receives rent amount
        amount: Math.round(rentAmount * 100), // Convert to paise
        currency: currency,
        on_hold: false, // Immediate transfer
      },
    ];

    // Add platform fee transfer if platform account is configured
    if (platformAccountId && serviceFee > 0) {
      transfers.push({
        account: platformAccountId, // Lendlly receives service fee
        amount: Math.round(serviceFee * 100),
        currency: currency,
      });
    }

    // Create order with transfers
    const options = {
      amount: Math.round(amount * 100), // Total amount in paise
      currency: currency,
      receipt: receipt || `receipt_${context.auth.uid}_${Date.now()}`,
      transfers: transfers,
      notes: {
        transactionId: transactionId || "",
        ownerId: ownerId,
        renterId: context.auth.uid,
        rentAmount: rentAmount.toString(),
        serviceFee: serviceFee.toString(),
        depositAmount: depositAmount ? depositAmount.toString() : "0",
        depositStatus: "held", // Deposit stays with platform
      },
    };

    const order = await razorpay.orders.create(options);

    // Update transaction with order details
    if (transactionId) {
      await admin.firestore()
        .collection("transactions")
        .doc(transactionId)
        .update({
          razorpayOrderId: order.id,
          paymentSplit: {
            rentAmount: rentAmount,
            serviceFee: serviceFee,
            depositAmount: depositAmount || 0,
            ownerAccountId: ownerAccountId,
            platformAccountId: platformAccountId || null,
          },
          depositStatus: "held", // Deposit is held in escrow
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      transfers: transfers,
    };
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to create payment order"
    );
  }
});

/**
 * Cloud Function: Verify Razorpay Payment Signature
 * Verifies the authenticity of a payment using the signature
 */
exports.verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to verify payment"
      );
    }

    const { orderId, paymentId, signature, transactionId } = data;

    // Validate input
    if (!orderId || !paymentId || !signature) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "orderId, paymentId, and signature are required"
      );
    }

    // Get Razorpay key secret from functions config
    const config = functions.config();
    const keySecret = config?.razorpay?.key_secret;

    if (!keySecret) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Razorpay key secret not configured"
      );
    }

    // Verify signature
    const text = orderId + "|" + paymentId;
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    const isValid = generatedSignature === signature;

    // If verified and transaction ID provided, update transaction
    if (isValid && transactionId) {
      await admin.firestore()
        .collection("transactions")
        .doc(transactionId)
        .update({
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
          razorpaySignature: signature,
          paymentStatus: "completed",
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    return {
      success: isValid,
      verified: isValid,
    };
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to verify payment"
    );
  }
});

/**
 * Cloud Function: Refund Deposit
 * Refunds the deposit amount to the renter after safe return
 */
exports.refundDeposit = functions.https.onCall(async (data, context) => {
  try {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to process refund"
      );
    }

    const { transactionId, refundAmount, reason = "Item returned safely" } = data;

    if (!transactionId || !refundAmount) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "transactionId and refundAmount are required"
      );
    }

    // Get transaction
    const transactionDoc = await admin.firestore()
      .collection("transactions")
      .doc(transactionId)
      .get();

    if (!transactionDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Transaction not found");
    }

    const transaction = transactionDoc.data();

    // Verify user is owner or admin
    const isOwner = transaction.ownerId === context.auth.uid;
    const isRenter = transaction.renterId === context.auth.uid;
    const userDoc = await admin.firestore()
      .collection("users")
      .doc(context.auth.uid)
      .get();
    const isAdmin = userDoc.data()?.systemRole === "admin";

    if (!isOwner && !isAdmin) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only owner or admin can process refunds"
      );
    }

    // Get Razorpay credentials
    const config = functions.config();
    const keyId = config?.razorpay?.key_id;
    const keySecret = config?.razorpay?.key_secret;

    if (!keyId || !keySecret) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Razorpay credentials not configured"
      );
    }

    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // Get payment ID from transaction
    const paymentId = transaction.razorpayPaymentId;
    if (!paymentId) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Payment ID not found in transaction"
      );
    }

    // Create refund
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(refundAmount * 100), // Convert to paise
      notes: {
        reason: reason,
        transactionId: transactionId,
        refundedBy: context.auth.uid,
      },
    });

    // Update transaction
    await admin.firestore()
      .collection("transactions")
      .doc(transactionId)
      .update({
        depositStatus: refundAmount >= (transaction.deposit || 0) ? "refunded" : "partially_refunded",
        refundAmount: refundAmount,
        refundId: refund.id,
        refundStatus: "processed",
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        refundReason: reason,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount / 100, // Convert back to rupees
      status: refund.status,
    };
  } catch (error) {
    console.error("Error processing deposit refund:", error);
    throw new functions.https.HttpsError(
      "internal",
      error.message || "Failed to process refund"
    );
  }
});