import DiscoverPageComp from '../components/discover/DiscoverPage'
import { useAuth } from '../hooks/useAuth'

export default function DiscoverPage() {
  const { user } = useAuth()
  return <DiscoverPageComp userId={user?.id || 0} myCity={user?.city} myCountry={user?.country} />
}
