import { Router } from "express"

const router = Router()

// All places used for SEO landing pages
const PLACES = [
  // Kenya
  "Nairobi","Mombasa","Kisumu","Nakuru","Eldoret","Thika","Malindi","Kitale","Garissa","Nyeri","Meru","Machakos","Kisii","Kakamega","Embu","Kericho","Migori","Homa Bay","Turkana","Kajiado","Muranga","Nandi","Bungoma","Vihiga","Trans Nzoia","Uasin Gishu","Samburu","Laikipia","Nyandarua","Narok","Bomet","Siaya","Busia","Isiolo","Marsabit","Wajir","Mandera","Lamu","Tana River","Taita Taveta","Kilifi","Kwale","Kitui","Makueni","Tharaka Nithi","Kiambu","Ruiru","Athi River","Limuru",
  // Nigeria
  "Lagos","Abuja","Port Harcourt","Kano","Ibadan","Kaduna","Benin City","Enugu","Onitsha","Aba","Warri","Abeokuta","Calabar","Ilorin","Jos","Maiduguri","Uyo","Asaba","Owerri","Akure","Osogbo","Sokoto","Zaria","Bauchi","Makurdi","Yola","Minna","Abakaliki","Awka","Lekki","Victoria Island","Ikeja","Surulere",
  // Uganda
  "Kampala","Entebbe","Jinja","Gulu","Mbarara","Masaka","Mukono","Mbale","Lira","Kasese","Fort Portal","Kabale","Soroti","Arua","Tororo","Wakiso","Kitgum","Hoima","Iganga","Buikwe",
  // Tanzania
  "Dar es Salaam","Arusha","Mwanza","Dodoma","Zanzibar","Moshi","Tanga","Morogoro","Mbeya","Iringa","Kigoma","Tabora","Shinyanga","Musoma","Songea",
  // Ghana
  "Accra","Kumasi","Tamale","Sekondi-Takoradi","Cape Coast","Obuasi","Koforidua","Sunyani","Wa","Ho","Bolgatanga","Tema","Kasoa","Techiman",
  // South Africa
  "Johannesburg","Cape Town","Durban","Pretoria","Port Elizabeth","Bloemfontein","East London","Nelspruit","Polokwane","Kimberley","Rustenburg","George","Pietermaritzburg","Witbank","Sandton","Soweto","Midrand","Stellenbosch","Paarl",
  // Zimbabwe
  "Harare","Bulawayo","Mutare","Gweru","Masvingo","Chinhoyi","Victoria Falls","Kwekwe","Bindura",
  // Zambia
  "Lusaka","Ndola","Kitwe","Livingstone","Kabwe","Chipata","Solwezi","Kasama",
  // Ethiopia
  "Addis Ababa","Dire Dawa","Mekelle","Gondar","Hawassa","Bahir Dar","Jimma",
  // Cameroon
  "Douala","Yaoundé","Bamenda","Bafoussam","Garoua",
  // Côte d'Ivoire
  "Abidjan","Bouaké","Daloa","Yamoussoukro",
  // Senegal
  "Dakar","Thiès","Kaolack","Saint-Louis","Ziguinchor",
  // Rwanda
  "Kigali","Butare","Gisenyi","Ruhengeri",
  // Mozambique
  "Maputo","Beira","Nampula","Nacala",
  // Malawi
  "Lilongwe","Blantyre","Mzuzu","Zomba",
  // Botswana
  "Gaborone","Francistown","Maun",
  // Namibia
  "Windhoek","Swakopmund","Walvis Bay",
  // Angola
  "Luanda","Huambo","Lobito","Benguela",
  // DRC
  "Kinshasa","Lubumbashi","Goma","Kisangani","Mbuji-Mayi",
  // Sudan / South Sudan
  "Khartoum","Omdurman","Juba","Wau",
  // Somalia / others
  "Mogadishu","Hargeisa","Mbabane","Maseru",
  // Philippines
  "Manila","Cebu","Davao","Quezon City","Makati","Pasig","Taguig","Zamboanga","Bacolod","Iloilo","General Santos","Cagayan de Oro","Antipolo","Caloocan","Valenzuela",
  // UAE / Gulf
  "Dubai","Abu Dhabi","Sharjah","Ajman","Riyadh","Jeddah","Mecca","Medina","Dammam","Doha","Kuwait City","Manama","Muscat",
  // UK
  "London","Manchester","Birmingham","Leeds","Glasgow","Edinburgh","Liverpool","Bristol","Sheffield","Newcastle","Nottingham","Leicester","Coventry","Bradford","Cardiff","Belfast",
  // USA
  "New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia","San Antonio","San Diego","Dallas","San Jose","Austin","Jacksonville","Fort Worth","Columbus","Charlotte","Indianapolis","San Francisco","Seattle","Denver","Nashville","Oklahoma City","El Paso","Washington DC","Las Vegas","Louisville","Memphis","Portland","Baltimore","Milwaukee","Albuquerque","Tucson","Atlanta","Miami","Minneapolis","Boston","Detroit","New Orleans","Tampa","Orlando",
  // Canada
  "Toronto","Vancouver","Montreal","Calgary","Edmonton","Ottawa","Winnipeg","Quebec City","Hamilton","Brampton","Mississauga","Surrey",
  // Australia
  "Sydney","Melbourne","Brisbane","Perth","Adelaide","Gold Coast","Canberra","Wollongong","Sunshine Coast",
  // New Zealand
  "Auckland","Wellington","Christchurch",
  // Germany
  "Berlin","Munich","Hamburg","Frankfurt","Cologne","Stuttgart","Düsseldorf","Leipzig",
  // France
  "Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Bordeaux",
  // Spain
  "Madrid","Barcelona","Valencia","Seville","Bilbao","Malaga",
  // Italy
  "Rome","Milan","Naples","Turin","Florence",
  // Netherlands / Belgium
  "Amsterdam","Rotterdam","Brussels","Antwerp",
  // Switzerland / Austria
  "Zurich","Geneva","Vienna",
  // Scandinavia
  "Stockholm","Gothenburg","Oslo","Copenhagen","Helsinki",
  // India
  "Mumbai","Delhi","Bangalore","Hyderabad","Chennai","Kolkata","Pune","Ahmedabad","Surat","Jaipur","Lucknow","Kochi","Chandigarh","Goa",
  // Pakistan / Bangladesh
  "Karachi","Lahore","Islamabad","Rawalpindi","Faisalabad","Dhaka","Chittagong","Sylhet",
  // Sri Lanka / Nepal / Myanmar
  "Colombo","Kandy","Kathmandu","Yangon",
  // Malaysia / Singapore / Indonesia
  "Kuala Lumpur","Penang","Johor Bahru","Kota Kinabalu","Kuching","Singapore","Jakarta","Surabaya","Bandung","Medan","Bali","Makassar","Semarang","Yogyakarta",
  // Thailand / Vietnam
  "Bangkok","Chiang Mai","Phuket","Pattaya","Ho Chi Minh City","Hanoi","Da Nang","Phnom Penh","Vientiane",
  // China / Japan / Korea
  "Beijing","Shanghai","Guangzhou","Shenzhen","Chengdu","Hong Kong","Tokyo","Osaka","Yokohama","Nagoya","Kyoto","Seoul","Busan","Incheon","Taipei",
  // Brazil
  "São Paulo","Rio de Janeiro","Brasília","Fortaleza","Salvador","Manaus","Curitiba","Recife","Porto Alegre","Belém",
  // Mexico
  "Mexico City","Guadalajara","Monterrey","Puebla","Cancún","Tijuana",
  // South America
  "Buenos Aires","Córdoba","Rosario","Bogotá","Medellín","Cali","Santiago","Lima",
  // North Africa
  "Cairo","Alexandria","Casablanca","Marrakech","Rabat","Tunis","Algiers","Oran",
  // Russia / Turkey / Middle East
  "Moscow","Saint Petersburg","Novosibirsk","Yekaterinburg","Istanbul","Ankara","Izmir","Antalya","Tel Aviv","Jerusalem","Tehran","Baghdad","Erbil","Kabul",
]

const CATEGORY_PREFIXES = [
  "sugar-daddy","sugar-mummy","rich-men","rich-women",
  "wealthy-men","wealthy-women","millionaire-dating",
  "cougar-dating","older-men","luxury-dating",
]

const GENERIC_SLUGS = [
  "sugar-daddy","sugar-mummy","rich-men-dating","rich-women-dating",
  "millionaire-dating","cougar-dating","luxury-dating",
  "seeking-arrangement","wealthy-singles","rich-dating",
]

const STATIC_PAGES = ["/","/login","/register","/members","/locations","/terms","/privacy","/contact"]

function toSlug(s: string) {
  return s.toLowerCase().replace(/['']/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}

router.get("/sitemap.xml", (_req, res) => {
  const base = "https://richdatingnetwork.com"
  const today = new Date().toISOString().slice(0, 10)

  const urls: string[] = []

  const add = (loc: string, priority: string, freq: string) => {
    urls.push(
      `  <url>\n    <loc>${base}${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    )
  }

  // Static pages
  for (const p of STATIC_PAGES) add(p, "0.8", "weekly")

  // Generic SEO pages
  for (const slug of GENERIC_SLUGS) add(`/${slug}`, "0.7", "monthly")

  // City pages — 10 categories × ~486 cities
  for (const place of PLACES) {
    const citySlug = toSlug(place)
    for (const prefix of CATEGORY_PREFIXES) {
      add(`/${prefix}-${citySlug}`, "0.6", "monthly")
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`

  res.setHeader("Content-Type", "application/xml; charset=utf-8")
  res.setHeader("Cache-Control", "public, max-age=86400")
  res.send(xml)
})

export default router
