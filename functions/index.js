// Use the v1 compatibility API so that functions.firestore.document(...) works with firebase-functions v7
const functions = require("firebase-functions/v1");
const { defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Define environment parameters
const emailUser = defineString("EMAIL_USER", { default: "lendlly2025@gmail.com" });
// NOTE: For simplicity, we use defineString for EMAIL_PASSWORD instead of a Secret,
// so we don't need functions.runWith(). This avoids the runWith() error you're seeing.
const emailPassword = defineString("EMAIL_PASSWORD");
const appUrl = defineString("APP_URL", { default: "https://lendlly.vercel.app" });

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
                <p style="margin: 5px 0;">Need help? Contact us at <a href="mailto:${emailUser.value()}" style="color: #4f46e5; text-decoration: none;">${emailUser.value()}</a></p>
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

        // Send email notification
        await admin.firestore().collection("email_notifications").add({
          email: recipient.email,
          subject: `New message from ${sender?.name || "a user"} - Rent Share`,
          message: `Hi ${recipient.name},\n\nYou have a new message on Rent Share!\n\nFrom: ${sender?.name || "A user"}\nRegarding: ${chat.listingTitle || "Your listing"}\n\nMessage: "${message.text}"\n\nReply now: ${appUrl.value()}/chat\n\nBest regards,\nRent Share Team`,
          type: "message",
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Message notification email created for ${recipient.email}`);
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