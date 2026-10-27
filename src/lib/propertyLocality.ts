type Locality={code_postal?:string|null;ville?:string|null}
export function propertyLocality(bien:Locality|null|undefined){const postal=String(bien?.code_postal??'').trim(),city=String(bien?.ville??'').trim();if(!postal)return city;if(!city)return postal;if(city===postal||city.startsWith(`${postal} `))return city;return `${postal} ${city}`}
