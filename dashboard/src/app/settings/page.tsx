export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
          {/* Persona Selection */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Profile Persona</h2>
            <p className="text-sm text-gray-600 mb-3">
              Select your primary goal to get personalized recommendations.
            </p>
            <select className="w-full border border-gray-300 rounded-lg p-3">
              <option value="job_seeker">Job Seeker</option>
              <option value="career_coach">Career Coach</option>
              <option value="service_provider">Service Provider</option>
              <option value="general">General Professional</option>
            </select>
          </div>

          {/* Account */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Account</h2>
            <p className="text-sm text-gray-600">
              Sign in with the same account you use in the Chrome extension.
            </p>
          </div>

          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
