export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Profile Score Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Profile Score</h2>
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600">--</div>
              <p className="text-gray-500 mt-2">Scan your profile to see your score</p>
            </div>
          </div>

          {/* Recent Updates Card */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Recent Updates</h2>
            <p className="text-gray-500">No updates yet.</p>
          </div>

          {/* Section Breakdown */}
          <div className="bg-white p-6 rounded-lg shadow-sm md:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Section Breakdown</h2>
            <div className="space-y-4">
              {['Headline', 'About', 'Experience', 'Skills', 'Education'].map((section) => (
                <div key={section} className="flex items-center">
                  <span className="w-32 text-sm text-gray-600">{section}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div className="bg-blue-600 h-3 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                  <span className="w-12 text-right text-sm text-gray-600">--</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
