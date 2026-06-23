import { Link } from 'wouter'
import { Heart } from 'lucide-react'

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: June 1, 2025</p>

        <div className="prose prose-gray max-w-none text-gray-600 space-y-8">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">
              By accessing or using the Rich Dating Network platform ("Service"), including our website at
              richdatingnetwork.com and any associated mobile applications, you agree to be bound by these Terms of
              Service ("Terms"). If you do not agree to all of these Terms, you may not access or use the Service.
              These Terms constitute a legally binding agreement between you and Rich Dating Network Limited
              ("Company", "we", "us", or "our").
            </p>
            <p className="leading-relaxed mt-3">
              We reserve the right to modify these Terms at any time. We will notify you of material changes by
              posting an updated version on our website and, where appropriate, sending you an email notification.
              Your continued use of the Service after any changes take effect constitutes your acceptance of the
              revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Eligibility</h2>
            <p className="leading-relaxed">
              The Service is intended for adults aged 18 years or older. By creating an account, you represent and
              warrant that:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>You are at least 18 years of age;</li>
              <li>You have the legal capacity to enter into a binding agreement;</li>
              <li>You are not prohibited by law from using dating or social networking services;</li>
              <li>You will maintain only one active account on the platform;</li>
              <li>You have not been convicted of a felony or sex offense, or any crime involving violence or harm
                to another person.</li>
            </ul>
            <p className="leading-relaxed mt-3">
              We reserve the right to verify your identity and age at any time and to suspend or terminate your
              account if we determine that you do not meet these eligibility requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Account Registration and Security</h2>
            <p className="leading-relaxed">
              To use certain features of the Service, you must register for an account. You agree to provide
              accurate, current, and complete information during registration and to update such information to keep
              it accurate, current, and complete. You are solely responsible for safeguarding your account
              credentials and for all activity that occurs under your account.
            </p>
            <p className="leading-relaxed mt-3">
              You must immediately notify us at support@richdatingnetwork.com of any unauthorized use of your
              account or any other breach of security. We cannot and will not be liable for any loss or damage
              arising from your failure to comply with this section. You may not share your account credentials
              with any third party or allow any third party to access your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. User Conduct and Prohibited Activities</h2>
            <p className="leading-relaxed">
              You agree to use the Service only for lawful purposes and in a manner that does not infringe upon the
              rights of others. You must not:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Post false, misleading, or fraudulent information about yourself or others;</li>
              <li>Harass, abuse, threaten, stalk, or intimidate any person;</li>
              <li>Solicit money or financial information from other members;</li>
              <li>Post or transmit any content that is obscene, offensive, defamatory, or illegal;</li>
              <li>Impersonate any person or entity, or falsely represent your affiliation with any person or entity;</li>
              <li>Collect or harvest personal information about other users without their consent;</li>
              <li>Use automated tools, bots, or scripts to interact with the Service;</li>
              <li>Attempt to circumvent any security measures or access controls;</li>
              <li>Post advertisements, spam, or promotional material without our prior written consent;</li>
              <li>Upload or transmit any viruses, malware, or other malicious code;</li>
              <li>Engage in any activity that violates applicable local, national, or international law.</li>
            </ul>
            <p className="leading-relaxed mt-3">
              We reserve the right to investigate and take appropriate legal action against anyone who violates
              these conduct standards, including removing offending content, suspending or terminating accounts,
              and reporting violations to law enforcement authorities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Premium Membership and Credits</h2>
            <p className="leading-relaxed">
              The Service offers both free and paid membership tiers. Certain features are only available to
              Premium members or require Credits to access. By purchasing a Premium subscription or Credits, you
              agree to the following:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>All purchases are final. Credits and Premium subscriptions are non-refundable except where
                required by applicable law;</li>
              <li>Credits have no cash value and cannot be transferred to another account or exchanged for currency;</li>
              <li>Premium subscriptions automatically renew unless you cancel at least 24 hours before the end
                of the current billing period;</li>
              <li>Prices are subject to change with reasonable notice. We will notify you of any price changes
                before they take effect;</li>
              <li>Payment processing is handled by our authorised payment partners. By purchasing, you agree to
                their respective terms and privacy policies;</li>
              <li>If your payment method fails and your account is downgraded, any unused Premium features will
                cease to be available immediately.</li>
            </ul>
            <p className="leading-relaxed mt-3">
              Refund requests are reviewed on a case-by-case basis. To submit a refund request, contact
              support@richdatingnetwork.com within 7 days of your purchase date with your payment reference number.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Content and Intellectual Property</h2>
            <p className="leading-relaxed">
              You retain ownership of any content you post to the Service ("User Content"). By submitting User
              Content, you grant us a worldwide, non-exclusive, royalty-free, sublicensable, and transferable
              licence to use, reproduce, distribute, prepare derivative works of, display, and perform the User
              Content in connection with operating and improving the Service.
            </p>
            <p className="leading-relaxed mt-3">
              You represent and warrant that you own or have the necessary rights to all User Content you submit,
              and that such content does not infringe any third-party intellectual property, privacy, or other
              rights. You agree not to post any content that depicts nudity or sexual acts, unless in a designated
              area of the Service specifically designated for such content (if any).
            </p>
            <p className="leading-relaxed mt-3">
              All other content on the Service, including but not limited to text, graphics, logos, icons, images,
              software, and the overall design of the platform, is the property of Rich Dating Network Limited
              and is protected by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Privacy</h2>
            <p className="leading-relaxed">
              Your use of the Service is also governed by our{' '}
              <Link href="/privacy" className="text-brand-500 hover:underline">Privacy Policy</Link>,
              which is incorporated into these Terms by reference. By using the Service, you consent to the
              collection, use, and sharing of your information as described in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Profile Verification and Safety</h2>
            <p className="leading-relaxed">
              We take member safety seriously and offer optional profile verification. Verified members have
              confirmed their identity through our verification process, though we do not guarantee the accuracy of
              any member's stated attributes including age, occupation, or relationship status. You are solely
              responsible for your interactions with other members. We recommend exercising caution when sharing
              personal information and arranging in-person meetings.
            </p>
            <p className="leading-relaxed mt-3">
              We reserve the right to remove profiles that we determine, in our sole discretion, to be fake,
              misleading, or in violation of these Terms. If you encounter a member you believe is behaving
              inappropriately, please use the "Report" feature available on every profile page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Disclaimer of Warranties</h2>
            <p className="leading-relaxed">
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT ANY WARRANTIES OF ANY KIND,
              EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
              UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
            </p>
            <p className="leading-relaxed mt-3">
              We do not guarantee that you will find a romantic partner through the Service, and we make no
              representations or warranties regarding the suitability, reliability, or accuracy of any member
              profiles or information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
            <p className="leading-relaxed">
              TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, RICH DATING NETWORK LIMITED SHALL NOT BE LIABLE
              FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR IN
              CONNECTION WITH YOUR USE OF THE SERVICE, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, LOSS OF DATA,
              OR LOSS OF GOODWILL, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="leading-relaxed mt-3">
              Our total aggregate liability to you for any claims arising out of or relating to these Terms or the
              Service shall not exceed the greater of (a) the total amount you paid us in the 12 months preceding
              the claim, or (b) USD $100.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Termination</h2>
            <p className="leading-relaxed">
              You may delete your account at any time by going to Settings → Account → Delete Account. Upon
              deletion, your profile and personal information will be removed from the Service in accordance with
              our data retention policy described in our Privacy Policy.
            </p>
            <p className="leading-relaxed mt-3">
              We reserve the right to suspend or terminate your account at any time, with or without notice, for
              any reason, including if we believe you have violated these Terms. Upon termination, any unused
              Credits or Premium subscription time will be forfeited without refund, except where required by
              applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Governing Law and Disputes</h2>
            <p className="leading-relaxed">
              These Terms shall be governed by and construed in accordance with applicable law. Any disputes
              arising out of or in connection with these Terms shall first be attempted to be resolved through
              good-faith negotiation. If such negotiation is unsuccessful, disputes shall be resolved through
              binding arbitration, except where prohibited by applicable consumer protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Contact Us</h2>
            <p className="leading-relaxed">
              If you have any questions about these Terms, please contact us:
            </p>
            <ul className="list-none ml-0 mt-2 space-y-1">
              <li><strong>Email:</strong> support@richdatingnetwork.com</li>
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
          <Link href="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
          <Link href="/contact" className="hover:text-gray-600">Contact</Link>
        </div>
        <p>© {new Date().getFullYear()} Rich Dating Network Limited. All rights reserved.</p>
      </footer>
    </div>
  )
}
