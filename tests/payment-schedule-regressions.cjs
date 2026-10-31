const assert=require('assert'),{loadSource}=require('./source-loader.cjs'),{paymentSchedule,paymentScheduleRows}=loadSource('src/lib/paymentSchedule.ts')
const lease={id:'b',bien_id:'B',date_entree:'2026-10-16',loyer_hc:620,charges:62},box={bail_id:'b',lot_id:'box',date_debut:'2026-10-16',prix_mensuel:62}
let r=paymentSchedule(lease,[box],[],'2026-10','2026-10');assert.equal(r.due,384);assert.equal(r.unpaid,384)
r=paymentSchedule(lease,[box],[{statut:'partiel',montant:200}],'2026-10','2026-10');assert.equal(r.unpaid,184)
r=paymentSchedule(lease,[],[{statut:'recu',montant:300,solde_anterieur:100,detail_echeance:{total:550,caution_montant:50}}],'2026-10','2026-10');assert.equal(r.due,500);assert.equal(r.unpaid,200)
r=paymentSchedule(lease,[],[{statut:'partiel',montant:100,detail_echeance:{total:200}},{statut:'partiel',montant:100,detail_echeance:{total:300}}],'2026-10','2026-10');assert.equal(r.due,null);assert.equal(r.unpaid,null)
r=paymentSchedule(lease,[],[],'2026-10','2026-11');assert.equal(r.due,null,'Un ancien mois sans montant enregistré ne doit pas être supposé')
assert.equal(paymentSchedule({...lease,date_sortie:'2026-10-31'},[],[],'2026-11','2026-11'),null)
assert.equal(paymentSchedule({...lease,actif:false},[],[],'2026-09','2026-10'),null,'Un bail ne doit pas apparaître avant son entrée')
const month=loadSource('src/lib/rentalTotals.ts').rentalDate().slice(0,7),start=`${month.slice(0,4)}-01-01`,baux=[{id:'b',bien_id:'B',date_entree:start,loyer_hc:700,charges:70}],tenants=[{id:'a',bail_id:'b',bien_id:'B',est_principal:true},{id:'c',bail_id:'b',bien_id:'B'}],annexes=[{bail_id:'b',lot_id:'box',date_debut:start,prix_mensuel:80}],payments=[{locataire_id:'a',mois:month,statut:'partiel',montant:300},{locataire_id:'c',mois:month,statut:'partiel',montant:200}]
let rows=paymentScheduleRows(baux,tenants,annexes,payments,month);assert.equal(rows.length,1);assert.equal(rows[0].due,850);assert.equal(rows[0].received,500);assert.equal(rows[0].unpaid,350)
assert.equal(paymentScheduleRows(baux,tenants,annexes,[],month)[0].unpaid,850);assert.equal(paymentScheduleRows(baux,[],annexes,payments,month).length,0)
rows=paymentScheduleRows([],tenants,[],[],month);assert.equal(rows.length,1);assert.equal(rows[0].due,null,'Un bail manquant ne doit pas être compté deux fois ni inventé')
console.log('Échéances : baux communs, paiements, prorata, annexes et historiques incomplets : OK')
