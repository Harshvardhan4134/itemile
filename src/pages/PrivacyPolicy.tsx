import { Header } from "@/components/Layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const PrivacyPolicy = () => {
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
            <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

            <div className="prose prose-slate max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                <p className="text-muted-foreground mb-4">
                  Welcome to Itemile ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our rental and swap marketplace platform.
                </p>
                <p className="text-muted-foreground">
                  By using Itemile, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our services.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
                
                <h3 className="text-xl font-semibold mb-3">2.1 Personal Information</h3>
                <p className="text-muted-foreground mb-4">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Name, email address, and phone number</li>
                  <li>Profile information and photos</li>
                  <li>Payment information (processed securely through third-party payment processors)</li>
                  <li>Location data (to help you find items nearby)</li>
                  <li>Government-issued identification for verification purposes</li>
                  <li>Communication preferences</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">2.2 Usage Information</h3>
                <p className="text-muted-foreground mb-4">
                  We automatically collect certain information when you use our platform:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Device information (IP address, browser type, operating system)</li>
                  <li>Usage patterns and interactions with our platform</li>
                  <li>Search queries and browsing history</li>
                  <li>Location data (with your permission)</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">2.3 Transaction Information</h3>
                <p className="text-muted-foreground">
                  We collect information related to your transactions, including rental agreements, swap proposals, payment history, and communication between users.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
                <p className="text-muted-foreground mb-4">
                  We use the information we collect to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and facilitate rentals and swaps</li>
                  <li>Verify user identities and prevent fraud</li>
                  <li>Send you updates, notifications, and marketing communications (with your consent)</li>
                  <li>Respond to your inquiries and provide customer support</li>
                  <li>Personalize your experience and show relevant content</li>
                  <li>Monitor and analyze usage patterns to improve our platform</li>
                  <li>Ensure platform security and prevent abuse</li>
                  <li>Comply with legal obligations and enforce our terms</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Information Sharing and Disclosure</h2>
                
                <h3 className="text-xl font-semibold mb-3">4.1 Public Information</h3>
                <p className="text-muted-foreground mb-4">
                  Certain information is publicly visible on our platform, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Your profile name and photo</li>
                  <li>Listings you create (item descriptions, photos, location)</li>
                  <li>Public reviews and ratings</li>
                  <li>Message posts and community interactions</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">4.2 Service Providers</h3>
                <p className="text-muted-foreground mb-4">
                  We may share your information with third-party service providers who perform services on our behalf, including:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Payment processors</li>
                  <li>Cloud storage providers</li>
                  <li>Analytics services</li>
                  <li>Email and messaging services</li>
                  <li>Identity verification services</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">4.3 Legal Requirements</h3>
                <p className="text-muted-foreground mb-4">
                  We may disclose your information if required by law or in response to valid requests by public authorities, or to protect our rights, property, or safety, or that of our users.
                </p>

                <h3 className="text-xl font-semibold mb-3">4.4 Business Transfers</h3>
                <p className="text-muted-foreground">
                  In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
                <p className="text-muted-foreground mb-4">
                  We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                </p>
                <p className="text-muted-foreground">
                  We use industry-standard encryption for sensitive data, secure authentication methods, and regular security audits to protect your information.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Your Rights and Choices</h2>
                <p className="text-muted-foreground mb-4">
                  You have the right to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Access and update your personal information through your account settings</li>
                  <li>Delete your account and request deletion of your personal data</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Request a copy of your personal data</li>
                  <li>Object to certain processing of your personal information</li>
                  <li>Withdraw consent where processing is based on consent</li>
                </ul>
                <p className="text-muted-foreground">
                  To exercise these rights, please contact us at support@itemile.com.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking Technologies</h2>
                <p className="text-muted-foreground mb-4">
                  We use cookies and similar tracking technologies to track activity on our platform and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our platform.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
                <p className="text-muted-foreground">
                  Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you become aware that a child has provided us with personal information, please contact us immediately.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
                <p className="text-muted-foreground">
                  Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. By using our services, you consent to the transfer of your information to these facilities.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">10. Changes to This Privacy Policy</h2>
                <p className="text-muted-foreground mb-4">
                  We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
                <p className="text-muted-foreground">
                  You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
                <p className="text-muted-foreground mb-4">
                  If you have any questions about this Privacy Policy, please contact us:
                </p>
                <ul className="list-none space-y-2 text-muted-foreground">
                  <li><strong>Email:</strong> support@itemile.com</li>
                  <li><strong>Website:</strong> https://itemile.com</li>
                </ul>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

