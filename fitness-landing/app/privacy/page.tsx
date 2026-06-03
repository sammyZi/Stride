import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-cream py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-sage-200 p-8 md:p-12">
        <Link href="/" className="text-sage-600 hover:text-sage-900 mb-8 inline-block">&larr; Back to Home</Link>
        <h1 className="text-3xl font-serif font-bold text-sage-900 mb-4">Privacy Policy</h1>
        <div className="prose prose-sage max-w-none text-sage-700">
           <p className="mb-4"><strong>Last Updated:</strong> May 22, 2026</p>
           <p className="mb-6"><strong>Stride</strong> ("the App", "we", "our", "us") is a fitness tracking application that helps you track walking and running activities. This Privacy Policy describes how we collect, use, and protect your personal information.</p>
           
           <h2 className="text-xl font-bold text-sage-900 mt-8 mb-4">1. Information We Collect</h2>
           <h3 className="text-lg font-semibold text-sage-800 mt-6 mb-2">1.1 Information You Provide</h3>
           <ul className="list-disc pl-5 mb-4 space-y-2">
             <li><strong>Account Information</strong>: When you create an account, we collect your email address and encrypted password. If you sign in with Google, we receive your name, email, and profile picture from Google.</li>
             <li><strong>Profile Information</strong>: Weight, height, and fitness preferences you optionally enter to improve calorie calculations.</li>
           </ul>

           <h3 className="text-lg font-semibold text-sage-800 mt-6 mb-2">1.2 Information Collected Automatically</h3>
           <ul className="list-disc pl-5 mb-4 space-y-2">
             <li><strong>Location Data</strong>: When you start an activity, we collect GPS coordinates to map your route, calculate distance, and track pace. We also collect background location data during active tracking sessions to ensure accurate route recording even when the app is in the background.</li>
             <li><strong>Activity &amp; Motion Data</strong>: Step counts and motion sensor data to detect walking and running activity.</li>
             <li><strong>Device Information</strong>: Device model, operating system version, and app version for troubleshooting and compatibility.</li>
           </ul>

           <h3 className="text-lg font-semibold text-sage-800 mt-6 mb-2">1.3 Information We Do NOT Collect</h3>
           <ul className="list-disc pl-5 mb-4 space-y-2">
             <li>We do <strong>not</strong> collect browsing history, contacts, photos, or any data unrelated to fitness tracking.</li>
             <li>We do <strong>not</strong> sell your personal data to third parties.</li>
             <li>We do <strong>not</strong> use your data for advertising purposes.</li>
           </ul>

           <h2 className="text-xl font-bold text-sage-900 mt-8 mb-4">2. How We Use Your Information</h2>
           <ul className="list-disc pl-5 mb-4 space-y-2">
             <li>Track and display your walking and running activities</li>
             <li>Calculate fitness metrics (distance, pace, calories, elevation)</li>
             <li>Store your activity history and personal records</li>
             <li>Sync your data across devices (when cloud sync is enabled)</li>
             <li>Set and track fitness goals</li>
             <li>Send activity-related notifications (e.g., milestone alerts)</li>
             <li>Improve app performance and fix bugs</li>
           </ul>

           <h2 className="text-xl font-bold text-sage-900 mt-8 mb-4">3. Data Storage &amp; Security</h2>
           <h3 className="text-lg font-semibold text-sage-800 mt-6 mb-2">3.1 Local Storage</h3>
           <ul className="list-disc pl-5 mb-4 space-y-2">
             <li>Activity data is stored locally on your device using encrypted local storage.</li>
             <li>You can use the app in offline/local-only mode without creating an account.</li>
           </ul>

           <h3 className="text-lg font-semibold text-sage-800 mt-6 mb-2">3.2 Cloud Storage</h3>
           <ul className="list-disc pl-5 mb-4 space-y-2">
             <li>If you create an account and enable cloud sync, your data is stored on <strong>Supabase</strong> (our cloud database provider) with industry-standard encryption.</li>
             <li>Data is encrypted in transit (TLS/HTTPS) and at rest.</li>
             <li>Your password is hashed and never stored in plaintext.</li>
           </ul>

           <h2 className="text-xl font-bold text-sage-900 mt-8 mb-4">4. Data Retention</h2>
           <ul className="list-disc pl-5 mb-4 space-y-2">
             <li><strong>Active accounts</strong>: Data is retained as long as your account is active.</li>
             <li><strong>Deleted accounts</strong>: When you delete your account, all associated cloud data is permanently deleted within 30 days.</li>
             <li><strong>Local data</strong>: Local data on your device persists until you uninstall the app or clear app data.</li>
           </ul>

           <h2 className="text-xl font-bold text-sage-900 mt-8 mb-4">5. Your Rights</h2>
           <ul className="list-disc pl-5 mb-4 space-y-2">
             <li><strong>Access</strong> your data: View all your activity history and profile within the app.</li>
             <li><strong>Export</strong> your data: Share activity summaries and data from within the app.</li>
             <li><strong>Delete</strong> your data: Delete individual activities, or delete your entire account from Settings &rarr; Account.</li>
             <li><strong>Opt out</strong> of cloud sync: Use the app in local-only mode without an account.</li>
             <li><strong>Control permissions</strong>: Revoke location and notification permissions at any time through your device settings.</li>
           </ul>

           <h2 className="text-xl font-bold text-sage-900 mt-8 mb-4">6. Location Data</h2>
           <p className="mb-2"><strong>Foreground</strong>: Location is accessed only during active activity tracking.</p>
           <p className="mb-4"><strong>Background</strong>: Background location is used <strong>only</strong> during an active tracking session to maintain route accuracy when the screen is off or the app is in the background. We <strong>never</strong> track your location when you are not actively recording an activity.</p>

           <h2 className="text-xl font-bold text-sage-900 mt-8 mb-4">7. Children's Privacy</h2>
           <p className="mb-4">Stride is not directed at children under the age of 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected data from a child under 13, we will delete it promptly.</p>

           <h2 className="text-xl font-bold text-sage-900 mt-8 mb-4">8. Changes to This Policy</h2>
           <p className="mb-4">We may update this Privacy Policy from time to time. We will notify you of significant changes via in-app notification or email. Continued use of the app after changes constitutes acceptance of the updated policy.</p>

           <h2 className="text-xl font-bold text-sage-900 mt-8 mb-4">9. Contact Us</h2>
           <p className="mb-2">If you have questions about this Privacy Policy or your data, please contact us at:</p>
           <ul className="list-disc pl-5 mb-4 space-y-2">
             <li><strong>Email</strong>: bhingesamarth@gmail.com</li>
             <li><strong>GitHub</strong>: https://github.com/sammyZi/Stride</li>
           </ul>
        </div>
      </div>
    </div>
  )
}
