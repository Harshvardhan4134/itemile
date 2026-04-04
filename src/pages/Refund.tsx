import { Header } from "@/components/Layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Refund = () => {
  return (
    <div className="app-shell">
      <Header />
      
      <div className="container py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardContent className="p-8 md:p-12">
            <h1 className="text-4xl font-bold mb-2">Cancellation & Refund Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

            <div className="prose prose-slate max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
                <p className="text-muted-foreground mb-4">
                  At Lendlly, we understand that plans can change. This Cancellation & Refund Policy outlines the terms and conditions for canceling rentals and receiving refunds on our peer-to-peer rental marketplace platform.
                </p>
                <p className="text-muted-foreground">
                  This policy applies to all rental transactions, security deposits, and service fees processed through Lendlly. Please read this policy carefully before making a rental booking.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">2. Rental Cancellations</h2>
                
                <h3 className="text-xl font-semibold mb-3">2.1 Cancellation by Renter</h3>
                <p className="text-muted-foreground mb-4">
                  Renters may cancel a rental booking under the following conditions:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li><strong>More than 48 hours before rental start:</strong> Full refund of rental fee and security deposit (if applicable), minus any service fees</li>
                  <li><strong>24-48 hours before rental start:</strong> 50% refund of rental fee, full refund of security deposit, minus service fees</li>
                  <li><strong>Less than 24 hours before rental start:</strong> No refund of rental fee, but security deposit will be fully refunded</li>
                  <li><strong>After rental period has started:</strong> No refunds, except in cases of item defects or misrepresentation (see Section 3)</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">2.2 Cancellation by Owner</h3>
                <p className="text-muted-foreground mb-4">
                  If an Owner cancels a confirmed rental:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Renter receives a full refund of all fees, including rental fee, security deposit, and service fees</li>
                  <li>Owner may be subject to penalties or account restrictions for repeated cancellations</li>
                  <li>Lendlly will assist in finding alternative rental options when possible</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">2.3 How to Cancel</h3>
                <p className="text-muted-foreground">
                  To cancel a rental, log into your Lendlly account, navigate to your bookings, and select the rental you wish to cancel. Follow the cancellation prompts. You will receive a confirmation email once the cancellation is processed.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">3. Refunds for Defective or Misrepresented Items</h2>
                <p className="text-muted-foreground mb-4">
                  If you receive an item that is:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Significantly different from the listing description</li>
                  <li>Not in working condition (unless stated as "for parts" or similar)</li>
                  <li>Damaged or unsafe to use</li>
                  <li>Missing essential components or accessories</li>
                </ul>
                <p className="text-muted-foreground mb-4">
                  You may be eligible for a full or partial refund. To request a refund:
                </p>
                <ol className="list-decimal pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Contact the Owner immediately through the Lendlly messaging system</li>
                  <li>Document the issue with photos or videos</li>
                  <li>Report the issue to Lendlly support within 24 hours of receiving the item</li>
                  <li>Return the item to the Owner in the same condition received</li>
                </ol>
                <p className="text-muted-foreground">
                  Lendlly will review the case and may issue a refund based on the circumstances. Refunds will be processed within 5-7 business days after approval.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Security Deposit Refunds</h2>
                <p className="text-muted-foreground mb-4">
                  Security deposits are held securely and will be refunded:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li><strong>Full refund:</strong> When the item is returned in the same condition as received (normal wear and tear excepted)</li>
                  <li><strong>Partial refund:</strong> If there is minor damage that doesn't exceed the deposit amount</li>
                  <li><strong>No refund:</strong> If the item is significantly damaged, lost, or stolen</li>
                </ul>
                <p className="text-muted-foreground mb-4">
                  Deposit refunds are typically processed within 3-5 business days after the item is returned and inspected by the Owner. If the Owner reports damage:
                </p>
                <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
                  <li>Owner must provide evidence of damage (photos, repair estimates)</li>
                  <li>Renter will be notified and can dispute the claim</li>
                  <li>Lendlly will mediate and make a final decision</li>
                  <li>Refund will be processed based on the final decision</li>
                </ol>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">5. Service Fees</h2>
                <p className="text-muted-foreground mb-4">
                  Service fees charged by Lendlly are generally non-refundable, except in the following cases:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Owner cancels the rental</li>
                  <li>Item is significantly misrepresented or defective</li>
                  <li>Technical issues on Lendlly's platform prevent the rental from proceeding</li>
                  <li>As required by applicable law</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Refund Processing</h2>
                <h3 className="text-xl font-semibold mb-3">6.1 Processing Time</h3>
                <p className="text-muted-foreground mb-4">
                  Refunds are typically processed within 5-7 business days after approval. The actual time for funds to appear in your account depends on your payment method:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li><strong>Credit/Debit Cards:</strong> 5-10 business days</li>
                  <li><strong>UPI:</strong> 2-3 business days</li>
                  <li><strong>Bank Transfer:</strong> 3-5 business days</li>
                  <li><strong>Digital Wallets:</strong> 1-3 business days</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">6.2 Refund Method</h3>
                <p className="text-muted-foreground">
                  Refunds will be issued to the original payment method used for the transaction. If the original payment method is no longer available, please contact support@lendlly.in to arrange an alternative refund method.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Dispute Resolution</h2>
                <p className="text-muted-foreground mb-4">
                  If you disagree with a refund decision or need to dispute a cancellation:
                </p>
                <ol className="list-decimal pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Contact Lendlly support at support@lendlly.in within 7 days of the decision</li>
                  <li>Provide all relevant documentation (photos, messages, receipts)</li>
                  <li>Our support team will review your case within 3-5 business days</li>
                  <li>We will provide a written decision and explanation</li>
                </ol>
                <p className="text-muted-foreground">
                  Lendlly's decisions regarding refunds and cancellations are final, but we are committed to fair resolution of all disputes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Special Circumstances</h2>
                <h3 className="text-xl font-semibold mb-3">8.1 Force Majeure</h3>
                <p className="text-muted-foreground mb-4">
                  In cases of natural disasters, pandemics, government restrictions, or other force majeure events, cancellation and refund policies may be adjusted. We will communicate any policy changes clearly and work with both parties to find fair solutions.
                </p>

                <h3 className="text-xl font-semibold mb-3">8.2 Long-Term Rentals</h3>
                <p className="text-muted-foreground">
                  For rentals longer than 30 days, special cancellation terms may apply. These will be clearly stated in the rental agreement before booking confirmation.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
                <p className="text-muted-foreground mb-4">
                  If you have questions about cancellations or refunds, please contact us:
                </p>
                <ul className="list-none space-y-2 text-muted-foreground">
                  <li><strong>Email:</strong> support@lendlly.in</li>
                  <li><strong>Website:</strong> https://lendlly.in</li>
                  <li><strong>Response Time:</strong> We aim to respond within 24-48 hours</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">10. Policy Updates</h2>
                <p className="text-muted-foreground">
                  We reserve the right to update this Cancellation & Refund Policy at any time. Changes will be posted on this page with an updated "Last updated" date. Continued use of Lendlly after policy changes constitutes acceptance of the new terms.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Refund;

