export default function TermsOfService() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-ink-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-ink-500">Last updated: {new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="mt-6 rounded-xl bg-accent-50 px-4 py-3 text-sm text-accent-700">
        This is a working draft, not final legal advice. Before relying on it in production, have it reviewed by an
        attorney admitted in South Africa.
      </div>

      <div className="prose-sm mt-8 flex flex-col gap-6 text-sm leading-relaxed text-ink-700">
        <section>
          <h2 className="text-lg font-bold text-ink-900">1. What OpenDoc is</h2>
          <p className="mt-2">
            OpenDoc is a directory and booking platform that lets patients find healthcare providers in South
            Africa — filterable by medical aid scheme accepted, specialty, and location — and book appointment
            slots those providers have published. OpenDoc is not a medical provider, does not practise medicine, and
            is not a party to the care relationship between you and any doctor you book with.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">2. Not a substitute for medical advice</h2>
          <p className="mt-2">
            Nothing on this platform is medical advice. In a medical emergency, contact local emergency services
            immediately rather than booking through this site.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">3. Provider listings and verification</h2>
          <p className="mt-2">
            Doctors self-register and provide their own HPCSA registration number, specialty, and the medical aid
            schemes they accept. A "verification pending" badge means OpenDoc has not yet confirmed the practitioner's
            HPCSA number; a "verified" badge means an OpenDoc reviewer has checked it against the number provided.
            Medical aid acceptance is self-reported by each provider and is not independently confirmed with the
            scheme — always verify coverage with your medical aid before your visit.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">4. Booking and cancellations</h2>
          <p className="mt-2">
            Booking a time slot reserves it with the provider. Cancellation, rescheduling, and no-show policies are
            set by each individual practice, not by OpenDoc — contact the practice directly for changes to a booked
            appointment.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">5. Patient files and referrals</h2>
          <p className="mt-2">
            Doctors may upload and transfer patient-related files to another doctor on the platform, typically as
            part of a referral. By providing a file to your doctor for this purpose, you consent to it being shared
            with the specific receiving doctor named in that transfer. Access to a transferred file is limited to
            the uploading doctor and the receiving doctor.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">6. Reviews</h2>
          <p className="mt-2">
            Patient reviews are submitted through a link tied to a specific completed booking and reflect that
            patient's own account of their visit. OpenDoc does not edit review content and may remove reviews that
            violate these terms (e.g. reviews not tied to an actual visit, or containing unlawful content).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">7. Account responsibilities</h2>
          <p className="mt-2">
            Providers are responsible for keeping their login credentials confidential and for the accuracy of their
            listing, including HPCSA number and medical aid acceptance. OpenDoc may suspend or remove a listing that
            is inaccurate, fraudulent, or in breach of these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">8. Limitation of liability</h2>
          <p className="mt-2">
            OpenDoc facilitates discovery and booking but is not responsible for the quality of care provided, the
            accuracy of a provider's self-reported information, or disputes between a patient and a provider. To the
            fullest extent permitted by South African law, OpenDoc's liability arising from use of the platform is
            limited to direct damages and excludes indirect or consequential loss.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink-900">9. Governing law</h2>
          <p className="mt-2">These terms are governed by the laws of the Republic of South Africa.</p>
        </section>
      </div>
    </div>
  )
}
