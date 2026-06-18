import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react";

interface UserAgreementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}

export default function UserAgreementDialog({
  open,
  onOpenChange,
  onAccept,
}: UserAgreementDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            User Agreement & Terms
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Please read and accept the terms before proceeding
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                Important: Damage & Loss Responsibility
              </h3>
              <p className="text-amber-800 dark:text-amber-200">
                By proceeding with this rental, you acknowledge and agree to the following terms:
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold mb-2">1. Item Condition & Responsibility</h4>
                <p className="text-muted-foreground">
                  You are fully responsible for the rented item during the entire rental period. 
                  This includes any damage, breakage, loss, or theft that occurs while the item is in your possession.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">2. Repair or Replacement Obligation</h4>
                <p className="text-muted-foreground">
                  In the event of any damage, breakage, or loss:
                </p>
                <ul className="list-disc list-inside ml-2 mt-1 space-y-1 text-muted-foreground">
                  <li>You agree to repair the item to its original condition at your expense, OR</li>
                  <li>You agree to replace the item with an equivalent or better item, OR</li>
                  <li>You agree to compensate the owner for the full value of the item</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">3. Return Condition</h4>
                <p className="text-muted-foreground">
                  You must return the item in the same condition as received. Any wear and tear beyond 
                  normal use will be considered damage and subject to repair or replacement costs.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">4. Inspection & Documentation</h4>
                <p className="text-muted-foreground">
                  Both parties are encouraged to inspect the item and document its condition with 
                  photos/videos at pickup and return. This documentation may be used to resolve any disputes.
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">5. Dispute Resolution</h4>
                <p className="text-muted-foreground">
                  In case of disputes regarding item condition or damage, Itemile may review the 
                  documentation and make a final decision. You agree to comply with such decisions.
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-blue-900 dark:text-blue-100 text-sm">
                <strong>By clicking "I Accept",</strong> you confirm that you have read, understood, 
                and agree to be bound by these terms. You acknowledge that you are financially 
                responsible for any damage, loss, or breakage of the rented item.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={onAccept}
            className="w-full sm:w-auto"
          >
            I Accept & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

