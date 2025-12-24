import { Header } from "@/components/Layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-background">
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
            <h1 className="text-4xl font-bold mb-2">Terms and Conditions</h1>
            <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

            <div className="prose prose-slate max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground mb-4">
                  Welcome to Lendlly. These Terms and Conditions ("Terms") govern your access to and use of our rental and swap marketplace platform ("Platform" or "Service"). By accessing or using Lendlly, you agree to be bound by these Terms.
                </p>
                <p className="text-muted-foreground">
                  If you do not agree to these Terms, you may not access or use our Platform. We reserve the right to modify these Terms at any time, and such modifications shall be effective immediately upon posting.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">2. Eligibility</h2>
                <p className="text-muted-foreground mb-4">
                  To use Lendlly, you must:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Be at least 18 years of age</li>
                  <li>Have the legal capacity to enter into binding agreements</li>
                  <li>Provide accurate and complete information during registration</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Comply with all applicable laws and regulations</li>
                  <li>Complete identity verification (KYC) as required</li>
                </ul>
                <p className="text-muted-foreground">
                  You are responsible for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">3. User Accounts and Verification</h2>
                <h3 className="text-xl font-semibold mb-3">3.1 Account Creation</h3>
                <p className="text-muted-foreground mb-4">
                  To use certain features of our Platform, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.
                </p>

                <h3 className="text-xl font-semibold mb-3">3.2 Identity Verification</h3>
                <p className="text-muted-foreground mb-4">
                  We may require you to verify your identity through our KYC (Know Your Customer) process. This may include providing government-issued identification and other documentation. Unverified accounts may have limited access to Platform features.
                </p>

                <h3 className="text-xl font-semibold mb-3">3.3 Account Security</h3>
                <p className="text-muted-foreground">
                  You are responsible for maintaining the confidentiality of your account password and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Platform Services</h2>
                <h3 className="text-xl font-semibold mb-3">4.1 Rental Services</h3>
                <p className="text-muted-foreground mb-4">
                  Lendlly facilitates peer-to-peer rentals of items. We act as an intermediary platform connecting item owners ("Owners") with renters ("Renters"). We are not a party to rental agreements between users.
                </p>

                <h3 className="text-xl font-semibold mb-3">4.2 Swap Services</h3>
                <p className="text-muted-foreground mb-4">
                  Our Platform also enables users to swap items with each other. Swaps are agreements between users, and Lendlly facilitates the connection but is not a party to swap agreements.
                </p>

                <h3 className="text-xl font-semibold mb-3">4.3 Platform Role</h3>
                <p className="text-muted-foreground">
                  Lendlly is a marketplace platform. We do not own, sell, or rent items listed on our Platform. We are not responsible for the quality, safety, or legality of items listed, the accuracy of listings, or the ability of users to complete transactions.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">5. User Responsibilities</h2>
                <h3 className="text-xl font-semibold mb-3">5.1 Item Owners</h3>
                <p className="text-muted-foreground mb-4">
                  As an Owner, you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Provide accurate and complete information about your items</li>
                  <li>Ensure items are safe, legal, and in good working condition</li>
                  <li>Honor rental and swap agreements</li>
                  <li>Respond promptly to rental requests and inquiries</li>
                  <li>Maintain appropriate insurance coverage for your items</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">5.2 Renters and Swappers</h3>
                <p className="text-muted-foreground mb-4">
                  As a Renter or Swapper, you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Use items only for their intended purpose</li>
                  <li>Return items in the same condition as received (normal wear and tear excepted)</li>
                  <li>Pay rental fees and any applicable damages promptly</li>
                  <li>Respect the terms of rental and swap agreements</li>
                  <li>Report any issues or damages immediately</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">5.3 Prohibited Activities</h3>
                <p className="text-muted-foreground mb-4">
                  You agree not to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>List illegal, stolen, or prohibited items</li>
                  <li>Engage in fraudulent, deceptive, or misleading practices</li>
                  <li>Harass, abuse, or harm other users</li>
                  <li>Violate any applicable laws or regulations</li>
                  <li>Interfere with or disrupt the Platform's operation</li>
                  <li>Use automated systems to access the Platform without authorization</li>
                  <li>Impersonate any person or entity</li>
                  <li>Collect or store personal data about other users without permission</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Payments and Fees</h2>
                <h3 className="text-xl font-semibold mb-3">6.1 Rental Payments</h3>
                <p className="text-muted-foreground mb-4">
                  Rental payments are processed through our secure payment system. Renters agree to pay the rental fee plus any applicable service fees. Payments are held securely until the rental period is completed.
                </p>

                <h3 className="text-xl font-semibold mb-3">6.2 Service Fees</h3>
                <p className="text-muted-foreground mb-4">
                  Lendlly may charge service fees for transactions. These fees will be clearly disclosed before you complete a transaction. Service fees are non-refundable except as required by law.
                </p>

                <h3 className="text-xl font-semibold mb-3">6.3 Refunds and Cancellations</h3>
                <p className="text-muted-foreground mb-4">
                  Refund and cancellation policies are determined by the terms agreed upon between users. Lendlly may facilitate refunds in accordance with our policies and applicable law.
                </p>

                <h3 className="text-xl font-semibold mb-3">6.4 Damages and Security Deposits</h3>
                <p className="text-muted-foreground">
                  Owners may require security deposits. Renters are responsible for any damages beyond normal wear and tear. Disputes regarding damages will be resolved in accordance with our dispute resolution process.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Dispute Resolution</h2>
                <p className="text-muted-foreground mb-4">
                  In the event of a dispute between users:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Users should first attempt to resolve disputes directly</li>
                  <li>Lendlly may provide mediation services to help resolve disputes</li>
                  <li>We reserve the right to suspend or terminate accounts involved in disputes</li>
                  <li>Users may be required to provide documentation and evidence</li>
                </ul>
                <p className="text-muted-foreground">
                  Lendlly's decisions regarding disputes are final, but we are not obligated to resolve all disputes. Users may pursue legal remedies independently.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Intellectual Property</h2>
                <p className="text-muted-foreground mb-4">
                  The Platform and its original content, features, and functionality are owned by Lendlly and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                </p>
                <p className="text-muted-foreground">
                  You retain ownership of content you post on the Platform, but you grant Lendlly a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content for the purpose of operating and promoting the Platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
                <p className="text-muted-foreground mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, LENDLLY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                </p>
                <p className="text-muted-foreground mb-4">
                  Lendlly is not responsible for:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>The quality, safety, or legality of items listed</li>
                  <li>The accuracy of listings or user information</li>
                  <li>The ability of users to complete transactions</li>
                  <li>User conduct or interactions</li>
                  <li>Damages or losses resulting from use of rented or swapped items</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
                <p className="text-muted-foreground">
                  You agree to indemnify, defend, and hold harmless Lendlly, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with your use of the Platform, your violation of these Terms, or your violation of any rights of another.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
                <p className="text-muted-foreground mb-4">
                  We may terminate or suspend your account and access to the Platform immediately, without prior notice or liability, for any reason, including if you breach these Terms.
                </p>
                <p className="text-muted-foreground">
                  Upon termination, your right to use the Platform will cease immediately. You may terminate your account at any time by contacting us or using account deletion features in your settings.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
                <p className="text-muted-foreground">
                  These Terms shall be governed by and construed in accordance with applicable laws, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of the competent courts.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
                <p className="text-muted-foreground mb-4">
                  We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.
                </p>
                <p className="text-muted-foreground">
                  What constitutes a material change will be determined at our sole discretion. Your continued use of the Platform after any changes constitutes acceptance of the new Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
                <p className="text-muted-foreground mb-4">
                  If you have any questions about these Terms and Conditions, please contact us:
                </p>
                <ul className="list-none space-y-2 text-muted-foreground">
                  <li><strong>Email:</strong> support@lendlly.in</li>
                  <li><strong>Website:</strong> https://lendlly.vercel.app/</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">15. Acknowledgment</h2>
                <p className="text-muted-foreground">
                  By using Lendlly, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these Terms, you must not use our Platform.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsAndConditions;

