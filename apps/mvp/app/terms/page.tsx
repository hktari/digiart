export const metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-6">
        Terms of Service
      </h1>

      <div className="prose prose-neutral">
        <p className="text-muted-foreground mb-4">
          Last updated:{" "}
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          1. Acceptance of Terms
        </h2>
        <p className="text-muted-foreground mb-4">
          By accessing or using our platform, you agree to be bound by these
          Terms of Service. If you do not agree, please do not use our services.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          2. Description of Service
        </h2>
        <p className="text-muted-foreground mb-4">
          We provide a platform for artists to share their work and for
          collectors to subscribe to and receive printed art books. Services
          include:
        </p>
        <ul className="list-disc pl-5 text-muted-foreground mb-4 space-y-1">
          <li>Creator profiles and artwork uploads</li>
          <li>Subscription management</li>
          <li>Print-on-demand book production</li>
          <li>Payment processing and creator payouts</li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          3. User Accounts
        </h2>
        <p className="text-muted-foreground mb-4">
          You must provide accurate information when creating an account. You
          are responsible for maintaining the security of your account and all
          activities that occur under it.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          4. Creator Content
        </h2>
        <p className="text-muted-foreground mb-4">
          By uploading content, you represent that you own or have the necessary
          rights to that content. You grant us a license to use, display, and
          distribute your content solely for the purpose of operating our
          platform.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          5. Payments and Payouts
        </h2>
        <p className="text-muted-foreground mb-4">
          Creators receive payouts based on subscription revenue sharing.
          Payouts are processed through PayPal. You are responsible for
          providing accurate payout information and complying with tax
          obligations.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          6. Prohibited Activities
        </h2>
        <p className="text-muted-foreground mb-4">You agree not to:</p>
        <ul className="list-disc pl-5 text-muted-foreground mb-4 space-y-1">
          <li>Upload infringing, illegal, or harmful content</li>
          <li>Attempt to circumvent our security measures</li>
          <li>Use the platform for fraudulent purposes</li>
          <li>Harass or abuse other users</li>
        </ul>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          7. Termination
        </h2>
        <p className="text-muted-foreground mb-4">
          We may suspend or terminate your account for violations of these
          terms. You may delete your account at any time.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          8. Limitation of Liability
        </h2>
        <p className="text-muted-foreground mb-4">
          We provide the platform &quot;as is&quot; without warranties. Our
          liability is limited to the amount you have paid us in the past 12
          months.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          9. Changes to Terms
        </h2>
        <p className="text-muted-foreground mb-4">
          We may update these terms from time to time. Continued use of the
          platform after changes constitutes acceptance of the new terms.
        </p>

        <h2 className="text-xl font-semibold text-foreground mt-6 mb-3">
          10. Contact Us
        </h2>
        <p className="text-muted-foreground">
          For questions about these Terms of Service, please contact us at
          support@digiart.example.
        </p>
      </div>
    </div>
  );
}
