export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">
            LinkedIn Profile Optimizer
          </h1>
          <p className="text-xl mb-8 text-blue-100">
            Score, optimize, and sync your LinkedIn profile with AI-powered suggestions.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="#"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              Install Chrome Extension
            </a>
            <a
              href="#dashboard"
              className="border border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
            >
              View Dashboard
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-blue-600 text-3xl font-bold mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Scan Your Profile</h3>
              <p className="text-gray-600">
                Install the Chrome extension and open your LinkedIn profile.
                We'll scan your profile and provide a completeness score.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-blue-600 text-3xl font-bold mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">Get AI Suggestions</h3>
              <p className="text-gray-600">
                Choose a section to optimize, upload your CV or write custom text,
                and get AI-powered suggestions for improvement.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="text-blue-600 text-3xl font-bold mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Sync to LinkedIn</h3>
              <p className="text-gray-600">
                Review and approve your changes, then sync them directly to
                LinkedIn or copy them manually. You're always in control.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>&copy; 2024 LinkedIn Profile Optimizer. Not affiliated with LinkedIn.</p>
        </div>
      </footer>
    </main>
  )
}
