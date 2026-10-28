import {loadPropertyPerformanceData} from '@/lib/propertyPerformanceData'
import ProfitabilityView from './ProfitabilityView'
export default async function Page(){return <ProfitabilityView data={await loadPropertyPerformanceData()}/>}
