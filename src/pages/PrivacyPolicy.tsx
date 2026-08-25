import Seo from '../components/Seo'

export default function PrivacyPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <Seo title="Privacy Policy" description="How OpenDoc collects, uses, and protects your personal information under South Africa's POPIA." path="/privacy" />
      <h1 className="text-3xl font-bold text-ink-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-ink-500">Last updated: {new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="mt-6 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">
        This is a working draft, not final legal advice. Before relying on it in production, have it reviewed by an
        attorney admitted in South Africa, familiar with the Protection of Personal Information Act 4 of 2013
        ("POPIA") and its treatment of health information as special personal information.
      </div>

      <div className="prose-sm mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-700">
        <section>
          <h2 className="text-lg font-bold text-ink-900">1. Who we are</h2>
          <p className="mt-2">
            OpenDoc ("we", "us") operates this platform, which connects patients in South Africa with healthcare
            providers for booking appointments and, for providers, coordinating referrals. We are the "Responsible
            Party" as defined under POPIA for personal information collected through this site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">2. What we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Patients booking an appointment:</strong> first and last name, email address, phone number, and any reason for visit you choose to share.</li>
            <li><strong>Doctors registering a provider account:</strong> name, practice details, HPCSA registration number, medical aid schemes accepted, and login credentials.</li>
            <li><strong>Patient files:</strong> when a doctor uploads a file relating to your care and transfers it to another provider on the platform, we store that file and metadata about who uploaded and received it.</li>
            <li><strong>Location:</strong> if you use "near me" search, your device's coordinates are sent to our server to compute distance and are not stored beyond the request unless you save a search.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">3. Special personal information</h2>
          <p className="mt-2">
            Health-related information — including the fact that you have booked with a particular type of
            specialist, any reason for visit you provide, and any patient files transferred between doctors — is
            "special personal information" under POPIA section 26. We process it only to the extent necessary to
            provide the booking and referral service you've requested, and processing here relies on the exception
            in POPIA section 32 for health service processing by (or on behalf of) responsible parties bound by a
            duty of confidentiality.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">4. How we use it</h2>
          <p className="mt-2">
            To operate the booking flow, notify the doctor you've booked with, send confirmation and reminder
            emails, allow doctors to transfer patient files to another provider you're being referred to, and
            maintain the security and integrity of the platform. We do not sell personal information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">5. Who we share it with</h2>
          <p className="mt-2">
            The doctor you book with (and, if they transfer your file, the receiving doctor) receives the
            information needed for your visit. We use third-party infrastructure providers (hosting, database, file
            storage, and email delivery) strictly to operate the platform — they process data on our instruction and
            are not permitted to use it for their own purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">6. Your rights</h2>
          <p className="mt-2">
            Under POPIA you may request access to, correction of, or deletion of your personal information, and you
            may object to processing on reasonable grounds. To exercise these rights, contact us using the details
            below. You may also lodge a complaint with the Information Regulator (South Africa) at{' '}
            <a href="https://inforegulator.org.za" className="text-brand-600 underline" target="_blank" rel="noreferrer">
              inforegulator.org.za
            </a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">7. Retention</h2>
          <p className="mt-2">
            We retain booking and patient file records for as long as your account or the related care relationship
            is active, and thereafter only as required to meet legal, medical record-keeping, or accounting
            obligations, after which it is deleted or anonymised.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">8. Security</h2>
          <p className="mt-2">
            Access to patient files is restricted to the uploading doctor and any doctor a file was explicitly
            transferred to; every download is authenticated. No system is completely secure, and we encourage you to
            use a strong, unique password on your provider account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">9. Contact</h2>
          <p className="mt-2">
            Questions about this policy or a request under POPIA can be sent to the practice or account contact
            listed for your booking, or to OpenDoc's designated Information Officer once appointed for this
            deployment.
          </p>
        </section>
      </div>
    </div>
  )
}
