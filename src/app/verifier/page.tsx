import type {Metadata} from 'next'
import Verification from './Verification'
export const metadata:Metadata={title:'Vérifier un document | Ekolocs',robots:{index:false,follow:false},referrer:'no-referrer'}
export default function Page(){return <Verification/>}
