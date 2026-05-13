export const metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-forogrorndmb-6">Privacy Policy</h1>

      <div className="prose prose-neutral">
        <p className="text-muted-foreground mb-4">
          Last updated:{" "}
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          1. Information We Collect
        </h2>
        <p className="text-muted-foreground mb-4">
          We collect information you provide directly to us, including:
        </p>
        <ul className="list-disc pl-5 text-muted-foreground mb-4 space-y-1">
          <li>Name and email address</li>
          <li>Profile information (display name, bio, avatar)</li>
          <li>
            Payment information (processed securely by our payment providers)
          </li>
          <li>Artwork and content you upload</li>
          <li>Shipping addresses for print deliveries</li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          2. How We Use Your Information
        </h2>
        <p className="text-muted-foreground mb-4">
          We use your information to:
        </p>
        <ul className="list-disc pl-5 text-muted-foreground mb-4 space-y-1">
          <li>Provide and maintain our services</li>
          <li>Process transactions and send payouts to creators</li>
          <li>Communicate with you about your account and subscriptions</li>
          <li>Send print orders to our fulfillment partners</li>
          <li>Improve our platform and user experience</li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          3. Information Sharing
        </h2>
        <p className="text-muted-foreground mb-4">
          We share your information only with:
        </p>
        <ul className="list-disc pl-5 text-muted-foreground mb-4 space-y-1">
          <li>Payment processors (Stripe, PayPal) to handle transactions</li>
          <li>Print fulfillment partners to produce and ship your orders</li>
          <li>Service providers who assist in operating our platform</li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          4. Data Security
        </h2>
        <p className="text-muted-foreground mb-4">
          We implement appropriate security measures to protect your personal
          information. However, no method of transmission over the Internet is
          100% secure.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          5. Your Rights
        </h2>
        <p className="text-muted-foreground mb-4">
          You have the right to access, correct, or delete your personal
          information. Contact us at privacy@digiart.example to exercise these
          rights.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          6. Contact Us
        </h2>
        <p className="text-muted-foreground">
          If you have questions about this Privacy Policy, please contact us at
          privacy@digiart.example.
        </p>
      </div>
    </div>
  );
}
