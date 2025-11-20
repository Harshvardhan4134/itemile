const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configure your email transport
// IMPORTANT: Replace with your actual email credentials
// For Gmail, you need to create an "App Password" at https://myaccount.google.com/apppasswords
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: functions.config().email?.user || "rentshare11@gmail.com",
    pass: functions.config().email?.password || "your-app-password-here", // Use App Password, not regular password
  },
});

/**
 * Cloud Function: Send Email Notifications
 * Triggers when a new document is created in the email_notifications collection
 */
exports.sendEmailNotification = functions.firestore
    .document("email_notifications/{notificationId}")
    .onCreate(async (snap, context) => {
      const data = snap.data();

      const mailOptions = {
        from: "Rent Share <rentshare11@gmail.com>",
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
                <p style="margin: 5px 0;">Need help? Contact us at <a href="mailto:rentshare11@gmail.com" style="color: #4f46e5; text-decoration: none;">rentshare11@gmail.com</a></p>
                <p style="margin: 5px 0;">Phone: +91 8547652100</p>
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
            message: `Hi ${owner.name},\n\nYou've received a new booking request!\n\nListing: ${transaction.listingTitle}\nRequested by: ${renter?.name || "A user"}${dateInfo}\n${amountInfo}\n\nPlease review and respond to this request in your Rent Share dashboard.\n\nView Booking: ${functions.config().app?.url || "https://yourapp.com"}/owner-bookings\n\nBest regards,\nRent Share Team`,
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
          message: `Hi ${recipient.name},\n\nYou have a new message on Rent Share!\n\nFrom: ${sender?.name || "A user"}\nRegarding: ${chat.listingTitle || "Your listing"}\n\nMessage: "${message.text}"\n\nReply now: ${functions.config().app?.url || "https://yourapp.com"}/chat\n\nBest regards,\nRent Share Team`,
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
