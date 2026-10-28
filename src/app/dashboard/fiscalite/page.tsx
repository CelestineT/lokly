import FiscalView from './FiscalView'
import {loadFiscalData} from '@/lib/fiscalData'
export default async function Page(){return <FiscalView {...await loadFiscalData()}/>}
