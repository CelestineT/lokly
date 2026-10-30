'use client'
import {useEffect,useState} from 'react'
import {createClient} from '@/lib/supabase/client'
import ExpenseEditForm from '../ExpenseEditForm'
export default function NouvelleDepensePage(){const [biens,setBiens]=useState<Array<{id:string;nom:string;ville:string}>>([]);useEffect(()=>{let active=true;createClient().from('biens').select('id,nom,ville').order('nom').then(({data})=>{if(active)setBiens(data??[])});return()=>{active=false}},[]);return <ExpenseEditForm create expense={{}} biens={biens}/>}
