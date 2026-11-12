// Illustrative governance composite (0-100, higher = stronger), WGI-style. NOT official values.
// n = ISO 3166 numeric code, used to join with the world-atlas geometry.
export const COUNTRIES = [
  ['GHA',288,'Ghana','Africa',7.9,-1.0,52,1.4],['MWI',454,'Malawi','Africa',-13.3,34.3,38,1.0],
  ['KEN',404,'Kenya','Africa',0.2,37.9,40,1.4],['NGA',566,'Nigeria','Africa',9.1,8.7,28,1.8],
  ['ETH',231,'Ethiopia','Africa',9.1,40.5,25,1.8],['TZA',834,'Tanzania','Africa',-6.4,34.9,37,1.6],
  ['UGA',800,'Uganda','Africa',1.4,32.3,33,1.0],['SEN',686,'Senegal','Africa',14.5,-14.5,48,1.0],
  ['MOZ',508,'Mozambique','Africa',-18.7,35.5,24,2.0],['ZMB',894,'Zambia','Africa',-13.1,27.8,36,1.6],
  ['COD',180,'DR Congo','Africa',-2.9,23.7,12,2.2],['EGY',818,'Egypt','MENA',26.8,30.8,32,1.6],
  ['MAR',504,'Morocco','MENA',31.8,-7.1,50,1.2],['JOR',400,'Jordan','MENA',30.6,36.2,52,0.8],
  ['IRQ',368,'Iraq','MENA',33.2,43.7,12,1.4],['IND',356,'India','South Asia',22.0,79.0,53,3.2],
  ['BGD',50,'Bangladesh','South Asia',23.7,90.4,26,0.8],['NPL',524,'Nepal','South Asia',28.4,84.1,33,1.0],
  ['PAK',586,'Pakistan','South Asia',30.4,69.3,22,1.8],['LKA',144,'Sri Lanka','South Asia',7.9,80.7,44,0.6],
  ['IDN',360,'Indonesia','East Asia',-2.5,118.0,50,3.0],['PHL',608,'Philippines','East Asia',12.9,121.8,46,1.4],
  ['VNM',704,'Vietnam','East Asia',14.1,108.3,48,1.2],['KHM',116,'Cambodia','East Asia',12.6,104.9,24,0.8],
  ['MNG',496,'Mongolia','East Asia',46.9,103.8,47,2.4],['PER',604,'Peru','Latin America',-9.2,-75.0,42,1.8],
  ['COL',170,'Colombia','Latin America',4.6,-74.1,47,1.6],['BOL',68,'Bolivia','Latin America',-16.3,-63.6,30,1.6],
  ['HND',340,'Honduras','Latin America',15.2,-86.2,24,0.7],['GTM',320,'Guatemala','Latin America',15.8,-90.2,25,0.7],
  ['HTI',332,'Haiti','Latin America',19.0,-72.3,6,0.4],['ECU',218,'Ecuador','Latin America',-1.8,-78.2,34,0.9],
  ['BRA',76,'Brazil','Latin America',-14.2,-51.9,45,3.2],['TUR',792,'Türkiye','Europe & Central Asia',38.9,35.2,40,1.8],
  ['UZB',860,'Uzbekistan','Europe & Central Asia',41.4,64.6,30,1.4],['GEO',268,'Georgia','Europe & Central Asia',42.3,43.4,62,0.5],
  ['UKR',804,'Ukraine','Europe & Central Asia',48.4,31.2,36,2.0],['MDA',498,'Moldova','Europe & Central Asia',47.4,28.4,45,0.4],
  ['ARM',51,'Armenia','Europe & Central Asia',40.1,45.0,54,0.3],['KGZ',417,'Kyrgyz Republic','Europe & Central Asia',41.2,74.8,28,0.9],
  ['ALB',8,'Albania','Europe & Central Asia',41.2,20.2,52,0.4],
].map(([iso,n,name,region,lat,lon,gov,spread])=>({iso,n,name,region,lat,lon,gov,spread,cpia:+(2.2+gov/100*2.6).toFixed(1)}));
export const BY_ISO = Object.fromEntries(COUNTRIES.map(c=>[c.iso,c]));
