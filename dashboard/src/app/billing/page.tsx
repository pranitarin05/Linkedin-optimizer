export default function BillingPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Billing</h1>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Current Plan</h2>
              <p className="text-gray-600">Free</p>
            </div>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Active
            </span>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">Free Tier Includes</h3>
            <ul className="space-y-2 text-gray-600">
              <li>✓ Profile scoring and recommendations</li>
              <li>✓ 5 AI content generations per month</li>
              <li>✓ Basic profile sync</li>
              <li>✓ Certification deep-links</li>
            </ul>
          </div>

          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold mb-3">Premium (Coming Soon)</h3>
            <ul className="space-y-2 text-gray-600">
              <li>✓ Unlimited AI content generations</li>
              <li>✓ Advanced analytics and trends</li>
              <li>✓ Priority support</li>
              <li>✓ Team features for career coaches</li>
            </ul>
            <button className="mt-4 bg-gray-200 text-gray-500 px-6 py-3 rounded-lg font-semibold cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
