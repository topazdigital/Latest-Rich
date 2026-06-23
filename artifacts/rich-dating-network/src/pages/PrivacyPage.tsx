import { Link } from 'wouter'
import { Heart } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center">
            <Heart size={14} className="text-white fill-white" />
          </div>
          <span className="font-bold text-gray-900">Rich Dating Network</span>
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: June 1, 2025</p>

        <div className="prose prose-gray max-w-none text-gray-600 space-y-8">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p className="leading-relaxed">
              Rich Dating Network Limited ("we", "us", or "our") operates the richdatingnetwork.com platform and
              related services (collectively, the "Service"). We are committed to protecting your personal
              information and your right to privacy. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our Service.
            </p>
            <p className="leading-relaxed mt-3">
              Please read this policy carefully. If you disagree with its terms, please discontinue use of our
              Service. This policy applies to all information collected through the Service and any related
              communications with us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <p className="leading-relaxed font-medium text-gray-700">Information You Provide Directly</p>
            <p className="leading-relaxed mt-1">
              When you register and use the Service, we collect information you provide, including:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Account information: name, email address, username, password (stored encrypted);</li>
              <li>Profile information: date of birth, gender, sexual orientation, relationship preferences,
                biography, and interests;</li>
              <li>Location data: city and country you provide during registration;</li>
              <li>Contact details: phone number (used for account verification and security);</li>
              <li>Photos and media you upload to your profile or posts;</li>
              <li>Messages and communications you exchange with other members through the Service;</li>
              <li>Payment information: billing address and transaction references (we do not store full card
                numbers — payment processing is handled by our payment partners);</li>
              <li>Support communications: any correspondence you send to our support team.</li>
            </ul>

            <p className="leading-relaxed font-medium text-gray-700 mt-4">Information Collected Automatically</p>
            <p className="leading-relaxed mt-1">
              When you use the Service, we automatically collect certain technical information, including:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Log data: IP address, browser type, operating system, pages visited, and timestamps;</li>
              <li>Device information: device type, unique device identifiers, and mobile network information;</li>
              <li>Usage data: features you use, profiles you view, and actions you take on the platform;</li>
              <li>Cookies and similar tracking technologies (see Section 8 for details).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="leading-relaxed">We use the information we collect to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Create and manage your account and provide the core matching and messaging features;</li>
              <li>Show your profile to other members and suggest compatible matches based on your preferences;</li>
              <li>Process payments and manage your subscription or credit balance;</li>
              <li>Send service-related notifications such as match alerts, message notifications, and account
                updates;</li>
              <li>Detect and prevent fraud, abuse, and violations of our Terms of Service;</li>
              <li>Improve and personalise the Service based on your usage patterns;</li>
              <li>Comply with legal obligations and respond to lawful requests from authorities;</li>
              <li>Respond to your support requests and resolve disputes;</li>
              <li>Send promotional communications where you have consented (you may opt out at any time).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. How We Share Your Information</h2>
            <p className="leading-relaxed">
              We do not sell your personal data to third parties. We may share your information in the following
              limited circumstances:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>With other members:</strong> Your public profile information (name, photos, bio,
                location, and stated preferences) is visible to other registered members. Your contact details
                and private messages are not publicly visible;</li>
              <li><strong>With service providers:</strong> We engage trusted third-party companies to help us
                operate the Service, including hosting providers, payment processors, and email delivery
                services. These providers access your data only to perform tasks on our behalf and are
                contractually obligated to protect it;</li>
              <li><strong>For legal compliance:</strong> We may disclose your information if required to do so
                by law, court order, or governmental authority, or if we believe disclosure is necessary to
                protect our rights, your safety, or the safety of others;</li>
              <li><strong>Business transfers:</strong> If we are involved in a merger, acquisition, or sale of
                assets, your information may be transferred as part of that transaction. We will notify you
                of any such change via email or prominent notice on the Service;</li>
              <li><strong>With your consent:</strong> We may share your information for any other purpose with
                your explicit consent.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Security</h2>
            <p className="leading-relaxed">
              We implement industry-standard technical and organisational measures to protect your personal
              information against unauthorised access, alteration, disclosure, or destruction. These measures
              include encrypted data transmission (HTTPS/TLS), hashed password storage, and access controls
              that limit who within our organisation can access your data.
            </p>
            <p className="leading-relaxed mt-3">
              However, no method of transmission over the internet or method of electronic storage is 100%
              secure. While we strive to use commercially acceptable means to protect your information, we
              cannot guarantee absolute security. In the event of a data breach that affects your rights and
              freedoms, we will notify you and the relevant authorities as required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention</h2>
            <p className="leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide
              the Service. If you delete your account, we will delete or anonymise your personal information
              within 30 days, except where we are required to retain it for legitimate legal or business purposes
              (for example, to resolve disputes, prevent fraud, or comply with legal obligations).
            </p>
            <p className="leading-relaxed mt-3">
              Messages sent to other members may remain visible in those members' inboxes after you delete your
              account, though your profile information will be removed from the message metadata.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights and Choices</h2>
            <p className="leading-relaxed">Depending on your location, you may have the right to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you;</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information via your account
                settings or by contacting us;</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information by deleting your
                account or contacting us directly;</li>
              <li><strong>Portability:</strong> Receive your personal data in a structured, machine-readable
                format;</li>
              <li><strong>Objection:</strong> Object to the processing of your data for marketing purposes at
                any time by updating your notification preferences or contacting us;</li>
              <li><strong>Restriction:</strong> Request that we restrict processing of your data in certain
                circumstances.</li>
            </ul>
            <p className="leading-relaxed mt-3">
              To exercise any of these rights, please contact us at privacy@richdatingnetwork.com. We will
              respond to your request within 30 days. We may need to verify your identity before processing
              your request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Cookies and Tracking Technologies</h2>
            <p className="leading-relaxed">
              We use cookies and similar technologies (such as local storage) to keep you logged in, remember
              your preferences, and understand how you use the Service. Specifically, we use:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Essential cookies:</strong> Required for the Service to function, including
                authentication tokens. These cannot be disabled without affecting your ability to use the
                platform;</li>
              <li><strong>Analytical cookies:</strong> Help us understand how members use the Service so we
                can improve it. This data is aggregated and anonymised;</li>
              <li><strong>Preference cookies:</strong> Remember your settings and personalisation choices.</li>
            </ul>
            <p className="leading-relaxed mt-3">
              You can control cookies through your browser settings. Disabling certain cookies may affect the
              functionality of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Children's Privacy</h2>
            <p className="leading-relaxed">
              The Service is strictly for adults aged 18 years and older. We do not knowingly collect personal
              information from anyone under the age of 18. If you believe a minor has provided us with personal
              information, please contact us immediately at support@richdatingnetwork.com and we will take
              prompt steps to delete that information and terminate the associated account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. International Data Transfers</h2>
            <p className="leading-relaxed">
              Our Service is operated globally and your information may be transferred to and processed in
              countries other than your country of residence. These countries may have data protection laws
              that differ from those in your country. By using the Service, you consent to such transfers.
              Where required, we implement appropriate safeguards to protect your data during international
              transfers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Third-Party Links</h2>
            <p className="leading-relaxed">
              The Service may contain links to third-party websites or services. We are not responsible for the
              privacy practices or content of those third parties. We encourage you to review the privacy
              policies of any third-party sites you visit.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Changes to This Policy</h2>
            <p className="leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any significant changes
              by posting the new policy on this page with an updated "Last updated" date and, where appropriate,
              sending you an email notification. We encourage you to review this policy periodically to stay
              informed about how we protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Contact Us</h2>
            <p className="leading-relaxed">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data
              practices, please contact us:
            </p>
            <ul className="list-none ml-0 mt-2 space-y-1">
              <li><strong>Email:</strong> privacy@richdatingnetwork.com</li>
              <li><strong>Support:</strong>{' '}
                <Link href="/contact" className="text-brand-500 hover:underline">Contact Support Page</Link>
              </li>
            </ul>
          </section>

        </div>
      </div>

      <footer className="border-t border-gray-100 py-6 px-4 text-center text-xs text-gray-400">
        <div className="flex items-center justify-center gap-4 flex-wrap mb-1">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <Link href="/terms" className="hover:text-gray-600">Terms of Service</Link>
          <Link href="/contact" className="hover:text-gray-600">Contact</Link>
        </div>
        <p>© {new Date().getFullYear()} Rich Dating Network Limited. All rights reserved.</p>
      </footer>
    </div>
  )
}
