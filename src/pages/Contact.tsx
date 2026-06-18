import { Header } from "@/components/Layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const Contact = () => {
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
            <h1 className="text-4xl font-bold mb-2">Contact Us</h1>
            <p className="text-muted-foreground mb-8">
              We're here to help! Get in touch with the Itemile team for support, questions, or feedback.
            </p>

            <div className="space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                          <Mail className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Email Support</h3>
                          <p className="text-muted-foreground mb-3">
                            For general inquiries, support, or feedback
                          </p>
                          <a 
                            href="mailto:support@itemile.com" 
                            className="text-primary hover:underline font-medium"
                          >
                            support@itemile.com
                          </a>
                          <p className="text-sm text-muted-foreground mt-2">
                            Response time: 24-48 hours
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                          <Phone className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Phone Support</h3>
                          <p className="text-muted-foreground mb-3">
                            Call us for immediate assistance or inquiries
                          </p>
                          <a 
                            href="mailto:support@itemile.com" 
                            className="text-primary hover:underline font-medium"
                          >
                            
                          </a>
                          <p className="text-sm text-muted-foreground mt-2">
                            Available: Monday - Friday, 9 AM - 6 PM IST
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Location</h3>
                          <p className="text-muted-foreground mb-3">
                            We're a digital-first platform serving cities across India
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Currently operating in major metropolitan areas
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-2">How do I report an issue with a rental?</h3>
                      <p className="text-muted-foreground">
                        If you encounter any issues with a rental, please contact us immediately at support@itemile.com with details, photos, and your booking reference number. We'll investigate and help resolve the issue.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-2">How can I become a verified user?</h3>
                      <p className="text-muted-foreground">
                        Complete your profile and submit your KYC documents through the verification section in your dashboard. Our team reviews submissions within 24-48 hours.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-2">What if I need help with a payment?</h3>
                      <p className="text-muted-foreground">
                        For payment-related issues, refunds, or transaction disputes, email us at <a href="mailto:support@itemile.com" className="text-primary hover:underline">support@itemile.com</a> or call <a href="mailto:support@itemile.com" className="text-primary hover:underline"></a> with your transaction ID and details. We'll assist you promptly.
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-2">How do I list an item for rent?</h3>
                      <p className="text-muted-foreground">
                        Simply click "List Your Item" in the header, fill out the item details, upload photos, set your rental price, and publish. Our platform makes it easy to start earning from your unused items.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Business Hours</h2>
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-2 text-muted-foreground">
                      <p><strong className="text-foreground">Phone Support:</strong> Monday - Friday, 9 AM - 6 PM IST</p>
                      <p><strong className="text-foreground">Phone:</strong> <a href="mailto:support@itemile.com" className="text-primary hover:underline"></a></p>
                      <p><strong className="text-foreground">Email Support:</strong> Available 24/7</p>
                      <p><strong className="text-foreground">Response Time:</strong> 24-48 hours (Monday - Friday)</p>
                      <p><strong className="text-foreground">Urgent Issues:</strong> We prioritize urgent matters and aim to respond within 12 hours</p>
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Other Ways to Reach Us</h2>
                <div className="space-y-3 text-muted-foreground">
                  <p>
                    <strong className="text-foreground">Phone:</strong> <a href="mailto:support@itemile.com" className="text-primary hover:underline"></a>
                  </p>
                  <p>
                    <strong className="text-foreground">Email:</strong> <a href="mailto:support@itemile.com" className="text-primary hover:underline">support@itemile.com</a>
                  </p>
                  <p>
                    <strong className="text-foreground">For Partners & Collaborations:</strong> support@itemile.com
                  </p>
                  <p>
                    <strong className="text-foreground">For Press & Media:</strong> support@itemile.com
                  </p>
                  <p>
                    <strong className="text-foreground">For Legal Matters:</strong> support@itemile.com
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Visit Our Website</h2>
                <p className="text-muted-foreground mb-4">
                  For more information about Itemile, our services, and policies, visit:
                </p>
                <a 
                  href="https://itemile.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  https://itemile.com
                </a>
              </section>

              <section className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  We value your feedback and are committed to providing excellent customer service. Don't hesitate to reach out if you need assistance or have suggestions to improve our platform.
                </p>
              </section>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Contact;

