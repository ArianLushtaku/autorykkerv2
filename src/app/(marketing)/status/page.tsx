import PageHero from '@/components/marketing/PageHero'
import { CheckCircle, AlertCircle, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'

const services = [
  {
    name: "API Gateway",
    status: "operational",
    uptime: "99.98%",
    responseTime: "145ms"
  },
  {
    name: "Dashboard",
    status: "operational", 
    uptime: "99.99%",
    responseTime: "89ms"
  },
  {
    name: "Påmindelser",
    status: "operational",
    uptime: "99.97%",
    responseTime: "234ms"
  },
  {
    name: "Integrationer",
    status: "operational",
    uptime: "99.95%",
    responseTime: "312ms"
  },
  {
    name: "Rapporter",
    status: "maintenance",
    uptime: "99.94%",
    responseTime: "456ms"
  },
  {
    name: "Notifikationer",
    status: "operational",
    uptime: "99.96%",
    responseTime: "178ms"
  }
]

const incidents = [
  {
    date: "2024-12-15",
    title: "Planlagt vedligeholdelse af rapportsystem",
    status: "scheduled",
    description: "Vi udfører planlagt vedligeholdelse af vores rapportsystem for at forbedre ydeevnen.",
    duration: "2 timer",
    impact: "Minimal"
  },
  {
    date: "2024-12-10", 
    title: "Kortvarig forsinkelse i påmindelser",
    status: "resolved",
    description: "Nogle påmindelser blev forsinket med op til 30 minutter på grund af høj belastning.",
    duration: "45 minutter",
    impact: "Lav"
  },
  {
    date: "2024-12-05",
    title: "API responstid forbedring",
    status: "resolved", 
    description: "Vi har optimeret vores API for hurtigere responstider på tværs af alle endpoints.",
    duration: "Løbende",
    impact: "Positiv"
  }
]

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'operational':
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case 'maintenance':
      return <Clock className="h-5 w-5 text-yellow-500" />
    case 'degraded':
      return <AlertCircle className="h-5 w-5 text-orange-500" />
    case 'outage':
      return <XCircle className="h-5 w-5 text-red-500" />
    default:
      return <CheckCircle className="h-5 w-5 text-green-500" />
  }
}

const getStatusText = (status: string) => {
  switch (status) {
    case 'operational':
      return 'Operationel'
    case 'maintenance':
      return 'Vedligeholdelse'
    case 'degraded':
      return 'Nedsat ydeevne'
    case 'outage':
      return 'Nedetid'
    default:
      return 'Operationel'
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'operational':
      return 'text-green-600'
    case 'maintenance':
      return 'text-yellow-600'
    case 'degraded':
      return 'text-orange-600'
    case 'outage':
      return 'text-red-600'
    default:
      return 'text-green-600'
  }
}

export default function StatusPage() {
  const overallStatus = services.every(s => s.status === 'operational') ? 'operational' : 'degraded'
  
  return (
    <>
      <PageHero 
        title="System Status"
        subtitle="Real-time status og ydeevne for alle Autorykker tjenester og systemer."
      />
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Overall Status */}
          <div className="mb-12">
            <div className="bg-white rounded-2xl border border-gray-200 p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <StatusIcon status={overallStatus} />
                  <div className="ml-4">
                    <h2 className="text-2xl font-bold text-navy">
                      Alle systemer {overallStatus === 'operational' ? 'operationelle' : 'delvist påvirket'}
                    </h2>
                    <p className="text-gray-600">
                      Sidst opdateret: {new Date().toLocaleString('da-DK')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">99.97%</div>
                  <div className="text-gray-600">Samlet oppetid (30 dage)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Services Status */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-navy mb-8">Tjenester</h2>
            <div className="space-y-4">
              {services.map((service, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <StatusIcon status={service.status} />
                      <div className="ml-4">
                        <h3 className="text-lg font-semibold text-navy">{service.name}</h3>
                        <p className={`text-sm ${getStatusColor(service.status)}`}>
                          {getStatusText(service.status)}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-8 text-sm text-gray-600">
                      <div className="text-center">
                        <div className="font-semibold text-navy">{service.uptime}</div>
                        <div>Oppetid (30d)</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-navy">{service.responseTime}</div>
                        <div>Responstid</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Incidents */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-navy mb-8">Seneste hændelser</h2>
            <div className="space-y-6">
              {incidents.map((incident, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          incident.status === 'resolved' ? 'bg-green-100 text-green-800' :
                          incident.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {incident.status === 'resolved' ? 'Løst' :
                           incident.status === 'scheduled' ? 'Planlagt' : 'Igangværende'}
                        </span>
                        <span className="ml-3 text-sm text-gray-500">{incident.date}</span>
                      </div>
                      <h3 className="text-lg font-semibold text-navy mb-2">{incident.title}</h3>
                      <p className="text-gray-600 mb-3">{incident.description}</p>
                      <div className="flex space-x-6 text-sm text-gray-500">
                        <span><strong>Varighed:</strong> {incident.duration}</span>
                        <span><strong>Påvirkning:</strong> {incident.impact}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-navy mb-8">Ydeevne (sidste 24 timer)</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <div className="text-3xl font-bold text-navy mb-2">2.1M</div>
                <div className="text-gray-600">API kald</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <div className="text-3xl font-bold text-navy mb-2">156ms</div>
                <div className="text-gray-600">Gns. responstid</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">99.99%</div>
                <div className="text-gray-600">Oppetid</div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <div className="text-3xl font-bold text-navy mb-2">45,231</div>
                <div className="text-gray-600">Påmindelser sendt</div>
              </div>
            </div>
          </div>

          {/* Subscribe to Updates */}
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-navy mb-4">
              Hold dig opdateret
            </h2>
            <p className="text-gray-600 mb-6">
              Få notifikationer om planlagt vedligeholdelse og systemstatus direkte i din indbakke.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <Link 
                href="/kontakt"
                className="bg-lime text-navy font-bold px-8 py-3 rounded-xl hover:scale-105 transition-transform"
              >
                Kontakt os for opdateringer
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
