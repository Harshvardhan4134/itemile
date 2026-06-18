import { Header } from "@/components/Layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Shipping = () => {
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
            <h1 className="text-4xl font-bold mb-2">Rentals & Delivery Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

            <div className="prose prose-slate max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
                <p className="text-muted-foreground mb-4">
                  At Itemile, we facilitate peer-to-peer rentals where items are handed over directly between Owners and Renters. This policy outlines how item handover, delivery, and pickup work on our platform.
                </p>
                <p className="text-muted-foreground">
                  Since Itemile is a marketplace connecting local users, most rentals involve direct handover between parties. This policy explains the different handover methods available and the responsibilities of each party.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">2. Handover Methods</h2>
                
                <h3 className="text-xl font-semibold mb-3">2.1 Direct Handover (Recommended)</h3>
                <p className="text-muted-foreground mb-4">
                  The most common method is direct handover at an agreed location:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Owner and Renter meet at a mutually convenient location</li>
                  <li>Both parties verify the item's condition together</li>
                  <li>Photos can be taken to document the item's state</li>
                  <li>Rental period begins upon handover</li>
                  <li>Return follows the same process at the end of the rental period</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">2.2 Pickup from Owner's Location</h3>
                <p className="text-muted-foreground mb-4">
                  Renters may pick up items from the Owner's specified location:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Owner provides pickup address (can be approximate for privacy)</li>
                  <li>Renter arrives at the agreed time</li>
                  <li>Owner verifies Renter's identity through the Itemile app</li>
                  <li>Item inspection and handover documentation completed</li>
                  <li>Renter is responsible for safe transport of the item</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">2.3 Delivery to Renter</h3>
                <p className="text-muted-foreground mb-4">
                  Some Owners may offer delivery services:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Delivery availability and fees are specified in the item listing</li>
                  <li>Owner arranges and pays for delivery (cost may be included in rental fee)</li>
                  <li>Renter must be available to receive the item at the agreed time</li>
                  <li>Item condition is verified upon delivery</li>
                  <li>Renter is responsible for return delivery arrangements unless otherwise specified</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">2.4 Third-Party Delivery Services</h3>
                <p className="text-muted-foreground">
                  Owners and Renters may agree to use third-party delivery services (e.g., courier, logistics companies):
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Both parties must agree on the delivery service and costs</li>
                  <li>Proper packaging and insurance are recommended</li>
                  <li>Tracking information should be shared through Itemile messaging</li>
                  <li>Itemile is not responsible for items lost or damaged during third-party delivery</li>
                  <li>Disputes regarding delivery are between the parties and the delivery service</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">3. Handover Process</h2>
                
                <h3 className="text-xl font-semibold mb-3">3.1 Before Handover</h3>
                <p className="text-muted-foreground mb-4">
                  Both parties should:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Confirm handover location, date, and time through Itemile messaging</li>
                  <li>Verify each other's identity using Itemile profiles</li>
                  <li>Ensure the item is clean and in the condition described in the listing</li>
                  <li>Prepare any necessary accessories, manuals, or documentation</li>
                  <li>Have the Itemile app ready for handover confirmation</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">3.2 During Handover</h3>
                <p className="text-muted-foreground mb-4">
                  At the handover:
                </p>
                <ol className="list-decimal pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Both parties verify identity (check Itemile profile photos and verification badges)</li>
                  <li>Inspect the item together for any existing damage or issues</li>
                  <li>Take photos of the item from multiple angles (especially for valuable items)</li>
                  <li>Test functionality if applicable (e.g., electronics, tools)</li>
                  <li>Confirm handover in the Itemile app</li>
                  <li>Rental period officially begins</li>
                </ol>

                <h3 className="text-xl font-semibold mb-3">3.3 Return Handover</h3>
                <p className="text-muted-foreground mb-4">
                  When returning the item:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Clean the item (unless otherwise agreed)</li>
                  <li>Return all accessories and components</li>
                  <li>Meet at the agreed location and time</li>
                  <li>Owner inspects the item for damage beyond normal wear and tear</li>
                  <li>Both parties confirm return in the Itemile app</li>
                  <li>Security deposit refund process begins (if applicable)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">4. Responsibilities</h2>
                
                <h3 className="text-xl font-semibold mb-3">4.1 Owner Responsibilities</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Provide accurate pickup/delivery location information</li>
                  <li>Be available at the agreed handover time</li>
                  <li>Ensure item is in the condition described in the listing</li>
                  <li>Provide necessary instructions, manuals, or accessories</li>
                  <li>Verify Renter's identity before handover</li>
                  <li>Document item condition with photos if requested</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">4.2 Renter Responsibilities</h3>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Arrive on time for handover and return</li>
                  <li>Verify Owner's identity before accepting the item</li>
                  <li>Inspect item thoroughly before accepting</li>
                  <li>Use item responsibly and return in the same condition (normal wear and tear excepted)</li>
                  <li>Return item at the agreed time and location</li>
                  <li>Report any issues or damages immediately</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">5. Delivery Fees and Costs</h2>
                <p className="text-muted-foreground mb-4">
                  Delivery and handover costs are determined as follows:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li><strong>Direct handover:</strong> No additional fees (both parties meet at agreed location)</li>
                  <li><strong>Owner delivery:</strong> Fees, if any, are specified in the item listing</li>
                  <li><strong>Renter pickup:</strong> Renter is responsible for transportation costs</li>
                  <li><strong>Third-party delivery:</strong> Costs are agreed upon between parties and may be split or assigned to one party</li>
                </ul>
                <p className="text-muted-foreground">
                  All delivery fees and arrangements should be discussed and agreed upon through Itemile messaging before the rental begins.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">6. Late Handovers and Returns</h2>
                <h3 className="text-xl font-semibold mb-3">6.1 Late Pickup</h3>
                <p className="text-muted-foreground mb-4">
                  If a Renter is late for pickup:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Owner should wait a reasonable time (15-30 minutes) or as agreed</li>
                  <li>If Renter doesn't show, Owner may cancel and Renter may forfeit rental fee</li>
                  <li>Communication through Itemile messaging is essential</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">6.2 Late Returns</h3>
                <p className="text-muted-foreground mb-4">
                  If a Renter returns an item late:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Additional rental fees may apply (pro-rated for the extra time)</li>
                  <li>Owner may charge late fees if specified in the rental agreement</li>
                  <li>Repeated late returns may result in account restrictions</li>
                  <li>Communication and agreement on extensions is recommended</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">7. Item Condition Documentation</h2>
                <p className="text-muted-foreground mb-4">
                  To protect both parties, we recommend:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Taking clear, timestamped photos of the item before handover</li>
                  <li>Documenting any existing scratches, dents, or wear</li>
                  <li>Testing functionality and noting any quirks or limitations</li>
                  <li>Sharing photos through Itemile messaging for record-keeping</li>
                  <li>Comparing condition photos at return to identify new damage</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">8. Safety and Security</h2>
                <p className="text-muted-foreground mb-4">
                  For your safety:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Meet in public, well-lit locations when possible</li>
                  <li>Verify identity through Itemile profiles before handover</li>
                  <li>Bring a friend or family member if you feel uncomfortable</li>
                  <li>Trust your instincts - if something feels wrong, don't proceed</li>
                  <li>Report any safety concerns to Itemile support immediately</li>
                  <li>Use Itemile's messaging system for all communications (don't share personal contact info until comfortable)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">9. Disputes and Issues</h2>
                <p className="text-muted-foreground mb-4">
                  If issues arise during handover or delivery:
                </p>
                <ol className="list-decimal pl-6 space-y-2 text-muted-foreground mb-4">
                  <li>Communicate immediately through Itemile messaging</li>
                  <li>Document the issue with photos or videos</li>
                  <li>Contact Itemile support at support@itemile.com</li>
                  <li>Provide all relevant details and documentation</li>
                  <li>Itemile will mediate and help resolve the dispute</li>
                </ol>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
                <p className="text-muted-foreground mb-4">
                  For questions about rentals, delivery, or handover processes:
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

export default Shipping;

