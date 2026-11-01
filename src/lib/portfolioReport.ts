export type ReportMetric={label:string;value:number|null;explanation:string;percent?:boolean}
export const reportToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export const reportValue=(m:ReportMetric)=>m.value==null||!Number.isFinite(m.value)?'Non calculable':m.percent?`${m.value.toLocaleString('fr-FR',{maximumFractionDigits:2})} %`:new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(m.value)
export function reportContext(metrics:ReportMetric[],scope:string,from:string,to:string){
 const date=(v:string)=>v.split('-').reverse().join('/'),find=(label:string)=>metrics.find(m=>m.label===label),parts=[`Cette synthèse porte sur ${scope}, du ${date(from)} au ${date(to)}. Les chiffres reflètent les données enregistrées pour ce périmètre et cette période.`]
 const income=find('Recettes encaissées'),expenses=find('Dépenses'),cash=find('Cash-flow après dette'),vacancy=find('Taux de vacance')
 if(income?.value!=null)parts.push(income.value===0?'Aucun encaissement n’est enregistré sur cette période. Cela ne permet pas de conclure à un impayé : vérifiez les versements saisis, leurs dates et le périmètre choisi.':`Les encaissements enregistrés s’élèvent à ${reportValue(income)}, hors caution.`)
 if(expenses?.value!=null)parts.push(`Les dépenses enregistrées représentent ${reportValue(expenses)}. Les charges présentées dans le rapport y sont déjà incluses.`)
 if(cash?.value!=null)parts.push(`Après dépenses, crédit et assurance, le cash-flow est ${cash.value<0?'négatif':cash.value>0?'positif':'nul'} (${reportValue(cash)}), avant fiscalité. ${cash.value<0?'Les sorties prises en compte dépassent les encaissements ; le détail des opérations doit être examiné avant d’en expliquer la cause.':'Cet indicateur décrit les flux de la période et ne constitue pas une prévision de rendement.'}`)
 if(vacancy?.value!=null)parts.push(`Le taux de vacance est de ${reportValue(vacancy)}. Il mesure les jours-logements sans bail sur la période, pas le taux d’impayés. Une absence de date de mise en location peut influer sur ce calcul.`)
 const missing=metrics.filter(m=>m.value==null||!Number.isFinite(m.value));if(missing.length)parts.push(`Indicateurs non calculables : ${missing.map(m=>m.label).join(', ')}. Consultez les explications et complétez ou vérifiez les données avant de transmettre le rapport.`)
 return parts
}
