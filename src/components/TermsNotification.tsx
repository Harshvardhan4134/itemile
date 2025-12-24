import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export interface TermsNotificationProps {
  open: boolean;
  onAccept: () => void;
  onRequestClose: (open: boolean) => void;
}

const TERMS_TITLE = "Terms & Conditions — Lendlly";
const TERMS_LAST_UPDATED = "Last Updated: November 2025";

const TermsNotification: React.FC<TermsNotificationProps> = ({
  open,
  onAccept,
  onRequestClose,
}) => {
  const sections = useMemo(
    () => [
      {
        heading: "1. Overview",
        body:
          "RentShare is a peer-to-peer platform that enables users to list, rent, or swap items within their community. The platform provides a secure and transparent environment for these transactions through our integrated SecurePay payment system.",
      },
      {
        heading: "2. Eligibility",
        list: [
          "You are at least 18 years old.",
          "You have a valid email and phone number.",
          "You agree to provide accurate and updated information.",
          "RentShare reserves the right to suspend or terminate accounts that violate these terms.",
        ],
      },
      {
        heading: "3. Account Registration",
        list: [
          "Users must register using a valid email, Google account, or mobile number.",
          "You are responsible for maintaining the confidentiality of your account credentials.",
          "You agree not to impersonate or misrepresent your identity.",
        ],
      },
      {
        heading: "4. Listing and Renting Items",
        list: [
          "Only legitimate and safe items may be listed on RentShare.",
          "Illegal, hazardous, or restricted items are strictly prohibited.",
          "The owner must accurately describe the item’s condition, value, and rental price.",
          "The renter must return the item in the same condition and within the agreed timeframe.",
          "RentShare reserves the right to remove or suspend any listing that violates platform policies.",
        ],
      },
      {
        heading: "5. Payments & SecurePay",
        list: [
          "All payments must be completed through RentShare SecurePay.",
          "SecurePay ensures transaction safety, deposit handling, and optional insurance coverage.",
          "RentShare applies a service charge (usually ₹5 or 5%) per transaction.",
          "Upon completion of a transaction, RentShare transfers the rental fee (minus service charges) to the owner’s wallet or linked account.",
        ],
      },
      {
        heading: "6. Deposits & Refunds",
        list: [
          "For items valued above ₹10,000, a security deposit is mandatory (typically 10–20% of item value).",
          "For items below ₹10,000, a micro deposit (₹300) may apply when using SecurePay.",
          "Deposits are held securely and refunded automatically once the item is returned and marked “verified” by the owner.",
          "If a dispute is raised, RentShare will temporarily hold the deposit until the issue is resolved.",
        ],
      },
      {
        heading: "7. Damage, Loss, or Dispute",
        subsections: [
          {
            title: "(a) Items Under ₹5,000",
            points: [
              "RentShare’s liability is limited to ₹300 per transaction.",
              "Damage compensation will be deducted from the micro-deposit or charged to the renter’s account.",
              "If no deposit is available, RentShare may restrict further rentals until dues are cleared.",
            ],
          },
          {
            title: "(b) Items Above ₹5,000",
            points: [
              "For items rented through SecurePay, the renter is liable for repair or replacement costs up to the item’s declared value.",
              "Deposit amounts may be partially or fully deducted to compensate for damage.",
            ],
          },
          {
            title: "(c) Insurance Coverage",
            points: [
              "If the renter opted for RentShare Insurance Add-on, accidental damage is covered up to the insured limit.",
              "Intentional or fraudulent damage is not covered under any circumstance.",
            ],
          },
        ],
      },
      {
        heading: "8. Platform Liability",
        body:
          "RentShare’s liability is limited and only applies to transactions made via SecurePay. If the payment occurs outside the platform (e.g., UPI, cash, Paytm, etc.), RentShare is not responsible for damage, loss, fraud, or disputes. No deposit or insurance coverage applies. Users engaging in off-platform payments do so at their own risk.",
      },
      {
        heading: "9. Prohibited Conduct",
        list: [
          "Rent or list stolen, illegal, or unsafe items.",
          "Damage or misuse rented items intentionally.",
          "Circumvent RentShare’s payment system to avoid fees.",
          "Post misleading or offensive content.",
          "Harass or threaten other users.",
          "Violation of these rules may result in suspension or permanent account termination.",
        ],
      },
      {
        heading: "10. Cancellations & Refunds",
        list: [
          "Cancellations before the rental start date may result in partial refunds (service fees are non-refundable).",
          "If a user cancels after approval, the deposit may be partially withheld.",
          "RentShare reserves the right to charge administrative or processing fees where applicable.",
        ],
      },
      {
        heading: "11. Ratings & Reviews",
        list: [
          "After each completed transaction, both parties can rate and review each other.",
          "Reviews must be honest, respectful, and factual.",
          "RentShare may remove any review that violates community guidelines.",
          "Repeated poor ratings or confirmed damages may reduce a user’s Trust Score, limiting their access to certain items or features.",
        ],
      },
      {
        heading: "12. Intellectual Property",
        body:
          "All logos, designs, UI components, and content within the platform belong to RentShare and may not be reproduced or distributed without written consent.",
      },
      {
        heading: "13. Privacy",
        list: [
          "Your personal data (email, phone, location) is collected only for verification, transaction processing, and safety purposes.",
          "RentShare will never sell your data to third parties.",
          "For more information, refer to our Privacy Policy.",
        ],
      },
      {
        heading: "14. Termination of Account",
        list: [
          "RentShare may suspend or terminate your account if you violate these Terms & Conditions.",
          "Engaging in fraudulent or abusive behavior may result in termination.",
          "Repeated failure to return items or causing damages can lead to account suspension.",
          "All pending deposits or earnings may be withheld during investigations.",
        ],
      },
      {
        heading: "15. Limitation of Liability",
        list: [
          "RentShare is not liable for any indirect or consequential losses.",
          "Issues arising from off-platform transactions fall outside RentShare’s responsibility.",
          "Misuse, negligence, or fraudulent claims by users are not covered.",
          "Our maximum liability, under any circumstance, shall not exceed the total service fee collected for that transaction.",
        ],
      },
      {
        heading: "16. Changes to Terms",
        body:
          "RentShare may update or modify these Terms & Conditions at any time. Users will be notified via email or app notification. Continued use of the platform after changes means you agree to the updated Terms.",
      },
      {
        heading: "17. Contact Us",
        body: "For support or disputes, reach out at support@lendlly.in.",
      },
    ],
    []
  );

  return (
    <Dialog open={open} onOpenChange={onRequestClose}>
      <DialogContent className="max-h-[85vh] sm:max-w-2xl gap-4 [&>button:last-of-type]:hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{TERMS_TITLE}</DialogTitle>
          <p className="text-sm text-muted-foreground">{TERMS_LAST_UPDATED}</p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 text-sm leading-relaxed">
            {sections.map((section) => (
              <div key={section.heading} className="space-y-2">
                <h3 className="font-semibold text-base">{section.heading}</h3>
                {section.body && <p>{section.body}</p>}
                {section.list && (
                  <ul className="list-disc pl-5 space-y-1">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.subsections && (
                  <div className="space-y-3">
                    {section.subsections.map((sub) => (
                      <div key={sub.title} className="space-y-1">
                        <p className="font-medium">{sub.title}</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {sub.points.map((point) => (
                            <li key={point}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="justify-between sm:justify-end gap-2">
          <Button onClick={onAccept} className="w-full sm:w-auto">
            Accept Terms & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TermsNotification;

