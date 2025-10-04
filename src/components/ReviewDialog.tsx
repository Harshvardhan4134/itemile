import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createReview, updateReview, getReviewByTransaction, Review, Transaction } from "@/lib/firestore";
import { auth } from "@/lib/firebase";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  revieweeId: string;
  revieweeName: string;
  onReviewSubmitted?: () => void;
}

export const ReviewDialog = ({
  open,
  onOpenChange,
  transaction,
  revieweeId,
  revieweeName,
  onReviewSubmitted
}: ReviewDialogProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<Review | null>(null);

  useEffect(() => {
    if (open && auth.currentUser) {
      loadExistingReview();
    }
  }, [open, transaction.id]);

  const loadExistingReview = async () => {
    if (!auth.currentUser) return;
    
    try {
      const review = await getReviewByTransaction(transaction.id, auth.currentUser.uid);
      if (review) {
        setExistingReview(review);
        setRating(review.rating);
        setComment(review.comment);
      } else {
        setExistingReview(null);
        setRating(5);
        setComment("");
      }
    } catch (error) {
      console.error("Error loading existing review:", error);
    }
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to submit a review",
        variant: "destructive"
      });
      return;
    }

    if (comment.trim().length < 10) {
      toast({
        title: "Error",
        description: "Please provide a review with at least 10 characters",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);

      if (existingReview) {
        // Update existing review
        await updateReview(existingReview.id, {
          rating,
          comment: comment.trim()
        });
        
        toast({
          title: "Review Updated",
          description: `Your review for ${revieweeName} has been updated`
        });
      } else {
        // Create new review
        const reviewData = {
          reviewerId: auth.currentUser.uid,
          reviewerName: auth.currentUser.displayName || "Anonymous",
          reviewerPhotoUrl: auth.currentUser.photoURL || undefined,
          revieweeId,
          transactionId: transaction.id,
          listingId: transaction.listingId || "",
          listingTitle: transaction.listingTitle || "Unknown Item",
          rating,
          comment: comment.trim()
        };

        await createReview(reviewData);
        
        toast({
          title: "Review Submitted",
          description: `Thank you for reviewing ${revieweeName}!`
        });
      }

      onOpenChange(false);
      onReviewSubmitted?.();
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {existingReview ? "Update Your Review" : "Review User"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">
              How was your experience with
            </p>
            <p className="font-semibold text-lg">{revieweeName}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Transaction: {transaction.listingTitle || "Unknown Item"}
            </p>
          </div>

          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Rating</Label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`h-8 w-8 ${
                      (hoveredRating || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Your Review</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience with this user. Was the transaction smooth? Would you rent from/to them again?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || comment.trim().length < 10}
          >
            {submitting
              ? "Submitting..."
              : existingReview
              ? "Update Review"
              : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;

