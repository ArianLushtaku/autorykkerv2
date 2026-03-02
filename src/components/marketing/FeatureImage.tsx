interface FeatureImageProps {
  type: 'reminders' | 'dashboard' | 'integration'
}

export default function FeatureImage({ type }: FeatureImageProps) {
  if (type === 'reminders') {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          {/* Email reminder preview */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-navy rounded-full flex items-center justify-center text-white font-bold">
                A
              </div>
              <div>
                <div className="font-semibold text-navy">Automatisk Rykker</div>
                <div className="text-sm text-gray-500">til kunde@firma.dk</div>
              </div>
            </div>
            <div className="text-xs text-gray-400">2 min siden</div>
          </div>
          
          <div className="space-y-3">
            <div className="text-sm text-gray-700">
              <strong>Emne:</strong> Påmindelse: Faktura #12345
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 leading-relaxed">
              Kære kunde,<br/><br/>
              Vi har endnu ikke modtaget betaling for faktura #12345 på 15.000 kr.<br/><br/>
              Forfaldsdato var d. 15. oktober 2024.
            </div>
            <div className="flex space-x-2">
              <div className="flex-1 bg-lime/20 text-navy text-center py-2 rounded-lg text-sm font-semibold">
                ✓ Sendt automatisk
              </div>
              <div className="flex-1 bg-blue-50 text-blue-700 text-center py-2 rounded-lg text-sm font-semibold">
                📧 Email
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'dashboard') {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Stats cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-navy">47</div>
              <div className="text-xs text-gray-600 mt-1">Udestående</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">12</div>
              <div className="text-xs text-gray-600 mt-1">Forfaldne</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">94%</div>
              <div className="text-xs text-gray-600 mt-1">Betalt</div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-end justify-between h-24 space-x-1">
              {[40, 65, 55, 80, 70, 90, 75, 85, 60, 95].map((height, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t transition-all ${
                    i % 2 === 0 ? 'bg-lime' : 'bg-lemon'
                  }`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-3 text-xs text-gray-500">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'integration') {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <div className="text-center mb-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">Tilsluttede integrationer</div>
          </div>
          
          {/* Integration cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  D
                </div>
                <div>
                  <div className="font-semibold text-navy">Dinero</div>
                  <div className="text-xs text-gray-500">Bogføring</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-700 font-medium">Tilsluttet</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-100 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  G
                </div>
                <div>
                  <div className="font-semibold text-navy">GoCardless</div>
                  <div className="text-xs text-gray-500">Bank data</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-700 font-medium">Tilsluttet</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg opacity-60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-400 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  E
                </div>
                <div>
                  <div className="font-semibold text-gray-700">E-conomic</div>
                  <div className="text-xs text-gray-500">Kommer snart</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 font-medium">Snart</div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-200">
            <div className="text-center text-xs text-gray-500">
              ⚡ Automatisk synkronisering hver time
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
