export interface SeoLandingPage {
  slug: string
  h1: string
  title: string
  description: string
  keywords: string[]
  intro: string
  country?: string
  city?: string
  category?: string
}

interface CityDef {
  city: string
  country: string
}

export const PLACES_LIST: CityDef[] = [
  // ── Kenya ──────────────────────────────────────────────────────────────────
  { city: "Nairobi", country: "Kenya" },
  { city: "Mombasa", country: "Kenya" },
  { city: "Kisumu", country: "Kenya" },
  { city: "Nakuru", country: "Kenya" },
  { city: "Eldoret", country: "Kenya" },
  { city: "Thika", country: "Kenya" },
  { city: "Malindi", country: "Kenya" },
  { city: "Kitale", country: "Kenya" },
  { city: "Garissa", country: "Kenya" },
  { city: "Nyeri", country: "Kenya" },
  { city: "Meru", country: "Kenya" },
  { city: "Machakos", country: "Kenya" },
  { city: "Kisii", country: "Kenya" },
  { city: "Kakamega", country: "Kenya" },
  { city: "Embu", country: "Kenya" },
  { city: "Kericho", country: "Kenya" },
  { city: "Migori", country: "Kenya" },
  { city: "Homa Bay", country: "Kenya" },
  { city: "Turkana", country: "Kenya" },
  { city: "Kajiado", country: "Kenya" },
  { city: "Muranga", country: "Kenya" },
  { city: "Nandi", country: "Kenya" },
  { city: "Bungoma", country: "Kenya" },
  { city: "Vihiga", country: "Kenya" },
  { city: "Trans Nzoia", country: "Kenya" },
  { city: "Uasin Gishu", country: "Kenya" },
  { city: "Samburu", country: "Kenya" },
  { city: "Laikipia", country: "Kenya" },
  { city: "Nyandarua", country: "Kenya" },
  { city: "Narok", country: "Kenya" },
  { city: "Bomet", country: "Kenya" },
  { city: "Siaya", country: "Kenya" },
  { city: "Busia", country: "Kenya" },
  { city: "Isiolo", country: "Kenya" },
  { city: "Marsabit", country: "Kenya" },
  { city: "Wajir", country: "Kenya" },
  { city: "Mandera", country: "Kenya" },
  { city: "Lamu", country: "Kenya" },
  { city: "Tana River", country: "Kenya" },
  { city: "Taita Taveta", country: "Kenya" },
  { city: "Kilifi", country: "Kenya" },
  { city: "Kwale", country: "Kenya" },
  { city: "Kitui", country: "Kenya" },
  { city: "Makueni", country: "Kenya" },
  { city: "Tharaka Nithi", country: "Kenya" },
  { city: "Kiambu", country: "Kenya" },
  { city: "Ruiru", country: "Kenya" },
  { city: "Athi River", country: "Kenya" },
  { city: "Limuru", country: "Kenya" },
  // ── Nigeria ────────────────────────────────────────────────────────────────
  { city: "Lagos", country: "Nigeria" },
  { city: "Abuja", country: "Nigeria" },
  { city: "Port Harcourt", country: "Nigeria" },
  { city: "Kano", country: "Nigeria" },
  { city: "Ibadan", country: "Nigeria" },
  { city: "Kaduna", country: "Nigeria" },
  { city: "Benin City", country: "Nigeria" },
  { city: "Enugu", country: "Nigeria" },
  { city: "Onitsha", country: "Nigeria" },
  { city: "Aba", country: "Nigeria" },
  { city: "Warri", country: "Nigeria" },
  { city: "Abeokuta", country: "Nigeria" },
  { city: "Calabar", country: "Nigeria" },
  { city: "Ilorin", country: "Nigeria" },
  { city: "Jos", country: "Nigeria" },
  { city: "Maiduguri", country: "Nigeria" },
  { city: "Uyo", country: "Nigeria" },
  { city: "Asaba", country: "Nigeria" },
  { city: "Owerri", country: "Nigeria" },
  { city: "Akure", country: "Nigeria" },
  { city: "Osogbo", country: "Nigeria" },
  { city: "Sokoto", country: "Nigeria" },
  { city: "Zaria", country: "Nigeria" },
  { city: "Bauchi", country: "Nigeria" },
  { city: "Makurdi", country: "Nigeria" },
  { city: "Yola", country: "Nigeria" },
  { city: "Minna", country: "Nigeria" },
  { city: "Abakaliki", country: "Nigeria" },
  { city: "Awka", country: "Nigeria" },
  { city: "Lekki", country: "Nigeria" },
  { city: "Victoria Island", country: "Nigeria" },
  { city: "Ikeja", country: "Nigeria" },
  { city: "Surulere", country: "Nigeria" },
  // ── Uganda ────────────────────────────────────────────────────────────────
  { city: "Kampala", country: "Uganda" },
  { city: "Entebbe", country: "Uganda" },
  { city: "Jinja", country: "Uganda" },
  { city: "Gulu", country: "Uganda" },
  { city: "Mbarara", country: "Uganda" },
  { city: "Masaka", country: "Uganda" },
  { city: "Mukono", country: "Uganda" },
  { city: "Mbale", country: "Uganda" },
  { city: "Lira", country: "Uganda" },
  { city: "Kasese", country: "Uganda" },
  { city: "Fort Portal", country: "Uganda" },
  { city: "Kabale", country: "Uganda" },
  { city: "Soroti", country: "Uganda" },
  { city: "Arua", country: "Uganda" },
  { city: "Tororo", country: "Uganda" },
  { city: "Wakiso", country: "Uganda" },
  { city: "Kitgum", country: "Uganda" },
  { city: "Hoima", country: "Uganda" },
  { city: "Iganga", country: "Uganda" },
  { city: "Buikwe", country: "Uganda" },
  // ── Tanzania ──────────────────────────────────────────────────────────────
  { city: "Dar es Salaam", country: "Tanzania" },
  { city: "Arusha", country: "Tanzania" },
  { city: "Mwanza", country: "Tanzania" },
  { city: "Dodoma", country: "Tanzania" },
  { city: "Zanzibar", country: "Tanzania" },
  { city: "Moshi", country: "Tanzania" },
  { city: "Tanga", country: "Tanzania" },
  { city: "Morogoro", country: "Tanzania" },
  { city: "Mbeya", country: "Tanzania" },
  { city: "Iringa", country: "Tanzania" },
  { city: "Kigoma", country: "Tanzania" },
  { city: "Tabora", country: "Tanzania" },
  { city: "Shinyanga", country: "Tanzania" },
  { city: "Musoma", country: "Tanzania" },
  { city: "Songea", country: "Tanzania" },
  // ── Ghana ──────────────────────────────────────────────────────────────────
  { city: "Accra", country: "Ghana" },
  { city: "Kumasi", country: "Ghana" },
  { city: "Tamale", country: "Ghana" },
  { city: "Sekondi-Takoradi", country: "Ghana" },
  { city: "Cape Coast", country: "Ghana" },
  { city: "Obuasi", country: "Ghana" },
  { city: "Koforidua", country: "Ghana" },
  { city: "Sunyani", country: "Ghana" },
  { city: "Wa", country: "Ghana" },
  { city: "Ho", country: "Ghana" },
  { city: "Bolgatanga", country: "Ghana" },
  { city: "Tema", country: "Ghana" },
  { city: "Kasoa", country: "Ghana" },
  { city: "Techiman", country: "Ghana" },
  // ── South Africa ──────────────────────────────────────────────────────────
  { city: "Johannesburg", country: "South Africa" },
  { city: "Cape Town", country: "South Africa" },
  { city: "Durban", country: "South Africa" },
  { city: "Pretoria", country: "South Africa" },
  { city: "Port Elizabeth", country: "South Africa" },
  { city: "Bloemfontein", country: "South Africa" },
  { city: "East London", country: "South Africa" },
  { city: "Nelspruit", country: "South Africa" },
  { city: "Polokwane", country: "South Africa" },
  { city: "Kimberley", country: "South Africa" },
  { city: "Rustenburg", country: "South Africa" },
  { city: "George", country: "South Africa" },
  { city: "Pietermaritzburg", country: "South Africa" },
  { city: "Witbank", country: "South Africa" },
  { city: "Sandton", country: "South Africa" },
  { city: "Soweto", country: "South Africa" },
  { city: "Midrand", country: "South Africa" },
  { city: "Stellenbosch", country: "South Africa" },
  { city: "Paarl", country: "South Africa" },
  // ── Zimbabwe ──────────────────────────────────────────────────────────────
  { city: "Harare", country: "Zimbabwe" },
  { city: "Bulawayo", country: "Zimbabwe" },
  { city: "Mutare", country: "Zimbabwe" },
  { city: "Gweru", country: "Zimbabwe" },
  { city: "Masvingo", country: "Zimbabwe" },
  { city: "Chinhoyi", country: "Zimbabwe" },
  { city: "Victoria Falls", country: "Zimbabwe" },
  { city: "Kwekwe", country: "Zimbabwe" },
  { city: "Bindura", country: "Zimbabwe" },
  // ── Zambia ────────────────────────────────────────────────────────────────
  { city: "Lusaka", country: "Zambia" },
  { city: "Ndola", country: "Zambia" },
  { city: "Kitwe", country: "Zambia" },
  { city: "Livingstone", country: "Zambia" },
  { city: "Kabwe", country: "Zambia" },
  { city: "Chipata", country: "Zambia" },
  { city: "Solwezi", country: "Zambia" },
  { city: "Kasama", country: "Zambia" },
  // ── Ethiopia ──────────────────────────────────────────────────────────────
  { city: "Addis Ababa", country: "Ethiopia" },
  { city: "Dire Dawa", country: "Ethiopia" },
  { city: "Mekelle", country: "Ethiopia" },
  { city: "Gondar", country: "Ethiopia" },
  { city: "Hawassa", country: "Ethiopia" },
  { city: "Bahir Dar", country: "Ethiopia" },
  { city: "Jimma", country: "Ethiopia" },
  // ── Cameroon ──────────────────────────────────────────────────────────────
  { city: "Douala", country: "Cameroon" },
  { city: "Yaoundé", country: "Cameroon" },
  { city: "Bamenda", country: "Cameroon" },
  { city: "Bafoussam", country: "Cameroon" },
  { city: "Garoua", country: "Cameroon" },
  // ── Côte d'Ivoire ─────────────────────────────────────────────────────────
  { city: "Abidjan", country: "Côte d'Ivoire" },
  { city: "Bouaké", country: "Côte d'Ivoire" },
  { city: "Daloa", country: "Côte d'Ivoire" },
  { city: "Yamoussoukro", country: "Côte d'Ivoire" },
  // ── Senegal ───────────────────────────────────────────────────────────────
  { city: "Dakar", country: "Senegal" },
  { city: "Thiès", country: "Senegal" },
  { city: "Kaolack", country: "Senegal" },
  { city: "Saint-Louis", country: "Senegal" },
  { city: "Ziguinchor", country: "Senegal" },
  // ── Rwanda ────────────────────────────────────────────────────────────────
  { city: "Kigali", country: "Rwanda" },
  { city: "Butare", country: "Rwanda" },
  { city: "Gisenyi", country: "Rwanda" },
  { city: "Ruhengeri", country: "Rwanda" },
  // ── Mozambique ────────────────────────────────────────────────────────────
  { city: "Maputo", country: "Mozambique" },
  { city: "Beira", country: "Mozambique" },
  { city: "Nampula", country: "Mozambique" },
  { city: "Nacala", country: "Mozambique" },
  // ── Malawi ────────────────────────────────────────────────────────────────
  { city: "Lilongwe", country: "Malawi" },
  { city: "Blantyre", country: "Malawi" },
  { city: "Mzuzu", country: "Malawi" },
  { city: "Zomba", country: "Malawi" },
  // ── Botswana ──────────────────────────────────────────────────────────────
  { city: "Gaborone", country: "Botswana" },
  { city: "Francistown", country: "Botswana" },
  { city: "Maun", country: "Botswana" },
  // ── Namibia ───────────────────────────────────────────────────────────────
  { city: "Windhoek", country: "Namibia" },
  { city: "Swakopmund", country: "Namibia" },
  { city: "Walvis Bay", country: "Namibia" },
  // ── Angola ────────────────────────────────────────────────────────────────
  { city: "Luanda", country: "Angola" },
  { city: "Huambo", country: "Angola" },
  { city: "Lobito", country: "Angola" },
  { city: "Benguela", country: "Angola" },
  // ── DRC ───────────────────────────────────────────────────────────────────
  { city: "Kinshasa", country: "DRC" },
  { city: "Lubumbashi", country: "DRC" },
  { city: "Goma", country: "DRC" },
  { city: "Kisangani", country: "DRC" },
  { city: "Mbuji-Mayi", country: "DRC" },
  // ── Sudan / South Sudan ───────────────────────────────────────────────────
  { city: "Khartoum", country: "Sudan" },
  { city: "Omdurman", country: "Sudan" },
  { city: "Juba", country: "South Sudan" },
  { city: "Wau", country: "South Sudan" },
  // ── Somalia ───────────────────────────────────────────────────────────────
  { city: "Mogadishu", country: "Somalia" },
  { city: "Hargeisa", country: "Somalia" },
  // ── Eswatini / Lesotho ────────────────────────────────────────────────────
  { city: "Mbabane", country: "Eswatini" },
  { city: "Maseru", country: "Lesotho" },
  // ── Philippines ───────────────────────────────────────────────────────────
  { city: "Manila", country: "the Philippines" },
  { city: "Cebu", country: "the Philippines" },
  { city: "Davao", country: "the Philippines" },
  { city: "Quezon City", country: "the Philippines" },
  { city: "Makati", country: "the Philippines" },
  { city: "Pasig", country: "the Philippines" },
  { city: "Taguig", country: "the Philippines" },
  { city: "Zamboanga", country: "the Philippines" },
  { city: "Bacolod", country: "the Philippines" },
  { city: "Iloilo", country: "the Philippines" },
  { city: "General Santos", country: "the Philippines" },
  { city: "Cagayan de Oro", country: "the Philippines" },
  { city: "Antipolo", country: "the Philippines" },
  { city: "Caloocan", country: "the Philippines" },
  { city: "Valenzuela", country: "the Philippines" },
  // ── UAE ───────────────────────────────────────────────────────────────────
  { city: "Dubai", country: "the UAE" },
  { city: "Abu Dhabi", country: "the UAE" },
  { city: "Sharjah", country: "the UAE" },
  { city: "Ajman", country: "the UAE" },
  // ── Saudi Arabia ──────────────────────────────────────────────────────────
  { city: "Riyadh", country: "Saudi Arabia" },
  { city: "Jeddah", country: "Saudi Arabia" },
  { city: "Mecca", country: "Saudi Arabia" },
  { city: "Medina", country: "Saudi Arabia" },
  { city: "Dammam", country: "Saudi Arabia" },
  // ── Qatar / Kuwait / Bahrain / Oman ──────────────────────────────────────
  { city: "Doha", country: "Qatar" },
  { city: "Kuwait City", country: "Kuwait" },
  { city: "Manama", country: "Bahrain" },
  { city: "Muscat", country: "Oman" },
  // ── UK ────────────────────────────────────────────────────────────────────
  { city: "London", country: "the UK" },
  { city: "Manchester", country: "the UK" },
  { city: "Birmingham", country: "the UK" },
  { city: "Leeds", country: "the UK" },
  { city: "Glasgow", country: "the UK" },
  { city: "Edinburgh", country: "the UK" },
  { city: "Liverpool", country: "the UK" },
  { city: "Bristol", country: "the UK" },
  { city: "Sheffield", country: "the UK" },
  { city: "Newcastle", country: "the UK" },
  { city: "Nottingham", country: "the UK" },
  { city: "Leicester", country: "the UK" },
  { city: "Coventry", country: "the UK" },
  { city: "Bradford", country: "the UK" },
  { city: "Cardiff", country: "the UK" },
  { city: "Belfast", country: "the UK" },
  // ── USA ───────────────────────────────────────────────────────────────────
  { city: "New York", country: "the USA" },
  { city: "Los Angeles", country: "the USA" },
  { city: "Chicago", country: "the USA" },
  { city: "Houston", country: "the USA" },
  { city: "Phoenix", country: "the USA" },
  { city: "Philadelphia", country: "the USA" },
  { city: "San Antonio", country: "the USA" },
  { city: "San Diego", country: "the USA" },
  { city: "Dallas", country: "the USA" },
  { city: "San Jose", country: "the USA" },
  { city: "Austin", country: "the USA" },
  { city: "Jacksonville", country: "the USA" },
  { city: "Fort Worth", country: "the USA" },
  { city: "Columbus", country: "the USA" },
  { city: "Charlotte", country: "the USA" },
  { city: "Indianapolis", country: "the USA" },
  { city: "San Francisco", country: "the USA" },
  { city: "Seattle", country: "the USA" },
  { city: "Denver", country: "the USA" },
  { city: "Nashville", country: "the USA" },
  { city: "Oklahoma City", country: "the USA" },
  { city: "El Paso", country: "the USA" },
  { city: "Washington DC", country: "the USA" },
  { city: "Las Vegas", country: "the USA" },
  { city: "Louisville", country: "the USA" },
  { city: "Memphis", country: "the USA" },
  { city: "Portland", country: "the USA" },
  { city: "Baltimore", country: "the USA" },
  { city: "Milwaukee", country: "the USA" },
  { city: "Albuquerque", country: "the USA" },
  { city: "Tucson", country: "the USA" },
  { city: "Atlanta", country: "the USA" },
  { city: "Miami", country: "the USA" },
  { city: "Minneapolis", country: "the USA" },
  { city: "Boston", country: "the USA" },
  { city: "Detroit", country: "the USA" },
  { city: "New Orleans", country: "the USA" },
  { city: "Tampa", country: "the USA" },
  { city: "Orlando", country: "the USA" },
  // ── Canada ────────────────────────────────────────────────────────────────
  { city: "Toronto", country: "Canada" },
  { city: "Vancouver", country: "Canada" },
  { city: "Montreal", country: "Canada" },
  { city: "Calgary", country: "Canada" },
  { city: "Edmonton", country: "Canada" },
  { city: "Ottawa", country: "Canada" },
  { city: "Winnipeg", country: "Canada" },
  { city: "Quebec City", country: "Canada" },
  { city: "Hamilton", country: "Canada" },
  { city: "Brampton", country: "Canada" },
  { city: "Mississauga", country: "Canada" },
  { city: "Surrey", country: "Canada" },
  // ── Australia ─────────────────────────────────────────────────────────────
  { city: "Sydney", country: "Australia" },
  { city: "Melbourne", country: "Australia" },
  { city: "Brisbane", country: "Australia" },
  { city: "Perth", country: "Australia" },
  { city: "Adelaide", country: "Australia" },
  { city: "Gold Coast", country: "Australia" },
  { city: "Canberra", country: "Australia" },
  { city: "Wollongong", country: "Australia" },
  { city: "Sunshine Coast", country: "Australia" },
  // ── New Zealand ───────────────────────────────────────────────────────────
  { city: "Auckland", country: "New Zealand" },
  { city: "Wellington", country: "New Zealand" },
  { city: "Christchurch", country: "New Zealand" },
  { city: "Hamilton", country: "New Zealand" },
  // ── Germany ───────────────────────────────────────────────────────────────
  { city: "Berlin", country: "Germany" },
  { city: "Munich", country: "Germany" },
  { city: "Hamburg", country: "Germany" },
  { city: "Frankfurt", country: "Germany" },
  { city: "Cologne", country: "Germany" },
  { city: "Stuttgart", country: "Germany" },
  { city: "Düsseldorf", country: "Germany" },
  { city: "Leipzig", country: "Germany" },
  // ── France ────────────────────────────────────────────────────────────────
  { city: "Paris", country: "France" },
  { city: "Marseille", country: "France" },
  { city: "Lyon", country: "France" },
  { city: "Toulouse", country: "France" },
  { city: "Nice", country: "France" },
  { city: "Nantes", country: "France" },
  { city: "Bordeaux", country: "France" },
  // ── Spain ─────────────────────────────────────────────────────────────────
  { city: "Madrid", country: "Spain" },
  { city: "Barcelona", country: "Spain" },
  { city: "Valencia", country: "Spain" },
  { city: "Seville", country: "Spain" },
  { city: "Bilbao", country: "Spain" },
  { city: "Malaga", country: "Spain" },
  // ── Italy ─────────────────────────────────────────────────────────────────
  { city: "Rome", country: "Italy" },
  { city: "Milan", country: "Italy" },
  { city: "Naples", country: "Italy" },
  { city: "Turin", country: "Italy" },
  { city: "Florence", country: "Italy" },
  // ── Netherlands / Belgium ─────────────────────────────────────────────────
  { city: "Amsterdam", country: "the Netherlands" },
  { city: "Rotterdam", country: "the Netherlands" },
  { city: "Brussels", country: "Belgium" },
  { city: "Antwerp", country: "Belgium" },
  // ── Switzerland / Austria ─────────────────────────────────────────────────
  { city: "Zurich", country: "Switzerland" },
  { city: "Geneva", country: "Switzerland" },
  { city: "Vienna", country: "Austria" },
  // ── Scandinavia ───────────────────────────────────────────────────────────
  { city: "Stockholm", country: "Sweden" },
  { city: "Gothenburg", country: "Sweden" },
  { city: "Oslo", country: "Norway" },
  { city: "Copenhagen", country: "Denmark" },
  { city: "Helsinki", country: "Finland" },
  // ── India ─────────────────────────────────────────────────────────────────
  { city: "Mumbai", country: "India" },
  { city: "Delhi", country: "India" },
  { city: "Bangalore", country: "India" },
  { city: "Hyderabad", country: "India" },
  { city: "Chennai", country: "India" },
  { city: "Kolkata", country: "India" },
  { city: "Pune", country: "India" },
  { city: "Ahmedabad", country: "India" },
  { city: "Surat", country: "India" },
  { city: "Jaipur", country: "India" },
  { city: "Lucknow", country: "India" },
  { city: "Kochi", country: "India" },
  { city: "Chandigarh", country: "India" },
  { city: "Goa", country: "India" },
  // ── Pakistan ──────────────────────────────────────────────────────────────
  { city: "Karachi", country: "Pakistan" },
  { city: "Lahore", country: "Pakistan" },
  { city: "Islamabad", country: "Pakistan" },
  { city: "Rawalpindi", country: "Pakistan" },
  { city: "Faisalabad", country: "Pakistan" },
  // ── Bangladesh / Sri Lanka ────────────────────────────────────────────────
  { city: "Dhaka", country: "Bangladesh" },
  { city: "Chittagong", country: "Bangladesh" },
  { city: "Sylhet", country: "Bangladesh" },
  { city: "Colombo", country: "Sri Lanka" },
  { city: "Kandy", country: "Sri Lanka" },
  // ── Nepal / Myanmar ───────────────────────────────────────────────────────
  { city: "Kathmandu", country: "Nepal" },
  { city: "Yangon", country: "Myanmar" },
  // ── Malaysia ──────────────────────────────────────────────────────────────
  { city: "Kuala Lumpur", country: "Malaysia" },
  { city: "Penang", country: "Malaysia" },
  { city: "Johor Bahru", country: "Malaysia" },
  { city: "Kota Kinabalu", country: "Malaysia" },
  { city: "Kuching", country: "Malaysia" },
  // ── Singapore ─────────────────────────────────────────────────────────────
  { city: "Singapore", country: "Singapore" },
  // ── Indonesia ─────────────────────────────────────────────────────────────
  { city: "Jakarta", country: "Indonesia" },
  { city: "Surabaya", country: "Indonesia" },
  { city: "Bandung", country: "Indonesia" },
  { city: "Medan", country: "Indonesia" },
  { city: "Bali", country: "Indonesia" },
  { city: "Makassar", country: "Indonesia" },
  { city: "Semarang", country: "Indonesia" },
  { city: "Yogyakarta", country: "Indonesia" },
  // ── Thailand ──────────────────────────────────────────────────────────────
  { city: "Bangkok", country: "Thailand" },
  { city: "Chiang Mai", country: "Thailand" },
  { city: "Phuket", country: "Thailand" },
  { city: "Pattaya", country: "Thailand" },
  // ── Vietnam / Cambodia / Laos ─────────────────────────────────────────────
  { city: "Ho Chi Minh City", country: "Vietnam" },
  { city: "Hanoi", country: "Vietnam" },
  { city: "Da Nang", country: "Vietnam" },
  { city: "Phnom Penh", country: "Cambodia" },
  { city: "Vientiane", country: "Laos" },
  // ── China ─────────────────────────────────────────────────────────────────
  { city: "Beijing", country: "China" },
  { city: "Shanghai", country: "China" },
  { city: "Guangzhou", country: "China" },
  { city: "Shenzhen", country: "China" },
  { city: "Chengdu", country: "China" },
  { city: "Hong Kong", country: "China" },
  // ── Japan ─────────────────────────────────────────────────────────────────
  { city: "Tokyo", country: "Japan" },
  { city: "Osaka", country: "Japan" },
  { city: "Yokohama", country: "Japan" },
  { city: "Nagoya", country: "Japan" },
  { city: "Kyoto", country: "Japan" },
  // ── South Korea / Taiwan ──────────────────────────────────────────────────
  { city: "Seoul", country: "South Korea" },
  { city: "Busan", country: "South Korea" },
  { city: "Incheon", country: "South Korea" },
  { city: "Taipei", country: "Taiwan" },
  // ── Brazil ────────────────────────────────────────────────────────────────
  { city: "São Paulo", country: "Brazil" },
  { city: "Rio de Janeiro", country: "Brazil" },
  { city: "Brasília", country: "Brazil" },
  { city: "Fortaleza", country: "Brazil" },
  { city: "Salvador", country: "Brazil" },
  { city: "Manaus", country: "Brazil" },
  { city: "Curitiba", country: "Brazil" },
  { city: "Recife", country: "Brazil" },
  { city: "Porto Alegre", country: "Brazil" },
  { city: "Belém", country: "Brazil" },
  // ── Mexico ────────────────────────────────────────────────────────────────
  { city: "Mexico City", country: "Mexico" },
  { city: "Guadalajara", country: "Mexico" },
  { city: "Monterrey", country: "Mexico" },
  { city: "Puebla", country: "Mexico" },
  { city: "Cancún", country: "Mexico" },
  { city: "Tijuana", country: "Mexico" },
  // ── South America ─────────────────────────────────────────────────────────
  { city: "Buenos Aires", country: "Argentina" },
  { city: "Córdoba", country: "Argentina" },
  { city: "Rosario", country: "Argentina" },
  { city: "Bogotá", country: "Colombia" },
  { city: "Medellín", country: "Colombia" },
  { city: "Cali", country: "Colombia" },
  { city: "Santiago", country: "Chile" },
  { city: "Lima", country: "Peru" },
  // ── North Africa ──────────────────────────────────────────────────────────
  { city: "Cairo", country: "Egypt" },
  { city: "Alexandria", country: "Egypt" },
  { city: "Casablanca", country: "Morocco" },
  { city: "Marrakech", country: "Morocco" },
  { city: "Rabat", country: "Morocco" },
  { city: "Tunis", country: "Tunisia" },
  { city: "Algiers", country: "Algeria" },
  { city: "Oran", country: "Algeria" },
  // ── Russia ────────────────────────────────────────────────────────────────
  { city: "Moscow", country: "Russia" },
  { city: "Saint Petersburg", country: "Russia" },
  { city: "Novosibirsk", country: "Russia" },
  { city: "Yekaterinburg", country: "Russia" },
  // ── Turkey / Middle East ──────────────────────────────────────────────────
  { city: "Istanbul", country: "Turkey" },
  { city: "Ankara", country: "Turkey" },
  { city: "Izmir", country: "Turkey" },
  { city: "Antalya", country: "Turkey" },
  { city: "Tel Aviv", country: "Israel" },
  { city: "Jerusalem", country: "Israel" },
  { city: "Tehran", country: "Iran" },
  { city: "Baghdad", country: "Iraq" },
  { city: "Erbil", country: "Iraq" },
  { city: "Kabul", country: "Afghanistan" },
]

function slugify(s: string) {
  return s.toLowerCase().replace(/['']/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// ── Category definitions ────────────────────────────────────────────────────

interface CategoryDef {
  prefix: string
  label: string
  h1: (city: string) => string
  title: (city: string, country: string) => string
  description: (city: string, country: string) => string
  keywords: (city: string) => string[]
  intro: (city: string, country: string) => string
}

const CATEGORIES: CategoryDef[] = [
  {
    prefix: 'sugar-daddy',
    label: 'Sugar Daddy',
    h1: c => `Find a Sugar Daddy in ${c}`,
    title: (c, co) => `Sugar Daddy ${c} | Meet Rich Sugar Daddies in ${c} — Rich Dating Network`,
    description: (c, co) => `Looking for a sugar daddy in ${c}? Join Rich Dating Network free and meet verified, wealthy sugar daddies in ${c}, ${co} today.`,
    keywords: c => [`sugar daddy ${c}`, `sugar daddy in ${c}`, `find sugar daddy ${c}`, `rich men ${c}`, `wealthy men ${c}`, `sugar daddy website ${c}`, `sugar daddy app ${c}`, `how to find a sugar daddy in ${c}`, `sugar daddy for free ${c}`, `genuine sugar daddy ${c}`, `sugar daddy dating site ${c}`, `generous men ${c}`, `rich older men ${c}`, `wealthy older men ${c}`],
    intro: (c, co) => `Thousands of successful, wealthy men in ${c} are ready to meet you on Rich Dating Network. Whether you're searching for a genuine sugar daddy who offers financial support, mentorship, and a comfortable lifestyle, or simply want to meet affluent men in ${c}, our platform makes it safe and easy. Create your free profile and start connecting today.`,
  },
  {
    prefix: 'sugar-mummy',
    label: 'Sugar Mummy',
    h1: c => `Find a Sugar Mummy in ${c}`,
    title: (c, co) => `Sugar Mummy ${c} | Meet Rich Sugar Mummies in ${c} — Rich Dating Network`,
    description: (c, co) => `Looking for a sugar mummy in ${c}? Join Rich Dating Network free and meet verified, wealthy sugar mummies in ${c}, ${co} today.`,
    keywords: c => [`sugar mummy ${c}`, `sugar mummy in ${c}`, `find sugar mummy ${c}`, `rich women ${c}`, `wealthy women ${c}`, `sugar mummy website ${c}`, `sugar mummy app ${c}`, `how to find a sugar mummy in ${c}`, `sugar mummy whatsapp ${c}`, `genuine sugar mummy ${c}`, `sugar mummy dating site ${c}`, `sugar mummy contacts ${c}`, `cougar ${c}`, `older women ${c}`],
    intro: (c, co) => `Meet real, verified sugar mummies in ${c} on Rich Dating Network. Our platform connects ambitious singles with successful, wealthy women in ${c}, ${co} who are looking for genuine companionship and willing to support the right partner. No scams, no fake profiles — join free today.`,
  },
  {
    prefix: 'rich-men',
    label: 'Rich Men',
    h1: c => `Meet Rich Men in ${c}`,
    title: (c, co) => `Rich Men in ${c} | Meet Wealthy Men in ${c} — Rich Dating Network`,
    description: (c, co) => `Looking to meet rich men in ${c}? Join Rich Dating Network free and connect with verified, wealthy men in ${c}, ${co}. Real profiles, real success stories.`,
    keywords: c => [`rich men ${c}`, `rich men in ${c}`, `meet rich men ${c}`, `wealthy men ${c}`, `wealthy men in ${c}`, `millionaire men ${c}`, `affluent men ${c}`, `successful men ${c}`, `date rich men ${c}`, `find rich men ${c}`, `rich guys ${c}`, `wealthy guys ${c}`, `rich boyfriend ${c}`, `wealthy boyfriend ${c}`, `financially stable men ${c}`, `well off men ${c}`, `high earning men ${c}`, `rich singles ${c}`],
    intro: (c, co) => `Rich Dating Network is the most trusted platform for meeting genuine wealthy men in ${c}. Whether you're looking for a long-term relationship with a successful man or simply want to connect with financially stable, ambitious men in ${c}, ${co}, our verified community makes it possible. Join free and browse real profiles today.`,
  },
  {
    prefix: 'rich-women',
    label: 'Rich Women',
    h1: c => `Meet Rich Women in ${c}`,
    title: (c, co) => `Rich Women in ${c} | Meet Wealthy Women in ${c} — Rich Dating Network`,
    description: (c, co) => `Looking to meet rich women in ${c}? Join Rich Dating Network free and connect with verified, wealthy women in ${c}, ${co}. Real profiles, real connections.`,
    keywords: c => [`rich women ${c}`, `rich women in ${c}`, `meet rich women ${c}`, `wealthy women ${c}`, `wealthy women in ${c}`, `millionaire women ${c}`, `affluent women ${c}`, `successful women ${c}`, `date rich women ${c}`, `find rich women ${c}`, `rich ladies ${c}`, `wealthy ladies ${c}`, `rich girlfriend ${c}`, `wealthy girlfriend ${c}`, `financially independent women ${c}`, `well off women ${c}`, `high earning women ${c}`, `rich female singles ${c}`],
    intro: (c, co) => `Rich Dating Network connects you with real, verified wealthy women in ${c}. From successful entrepreneurs to established professionals, the women on our platform in ${c}, ${co} are looking for genuine connection. Create your free profile and start meeting affluent women today.`,
  },
  {
    prefix: 'wealthy-men',
    label: 'Wealthy Men Dating',
    h1: c => `Wealthy Men Dating in ${c}`,
    title: (c, co) => `Wealthy Men Dating ${c} | Meet Affluent Men in ${c} — Rich Dating Network`,
    description: (c, co) => `Find wealthy men in ${c} for dating and relationships. Rich Dating Network connects you with verified, affluent men in ${c}, ${co}. Free to join.`,
    keywords: c => [`wealthy men dating ${c}`, `wealthy men ${c}`, `affluent men ${c}`, `meet wealthy men ${c}`, `high net worth men ${c}`, `rich singles men ${c}`, `elite men ${c}`, `luxury dating men ${c}`, `premium dating ${c} men`, `established men ${c}`, `successful single men ${c}`, `rich dating ${c}`, `men with money ${c}`, `millionaire match ${c}`, `wealthy singles men ${c}`],
    intro: (c, co) => `Looking for a relationship with a wealthy, established man in ${c}? Rich Dating Network is home to thousands of verified, high-net-worth men across ${co} who are genuinely looking for meaningful connections. Join free and start browsing today.`,
  },
  {
    prefix: 'wealthy-women',
    label: 'Wealthy Women Dating',
    h1: c => `Wealthy Women Dating in ${c}`,
    title: (c, co) => `Wealthy Women Dating ${c} | Meet Affluent Women in ${c} — Rich Dating Network`,
    description: (c, co) => `Find wealthy women in ${c} for dating and relationships. Rich Dating Network connects you with verified, affluent women in ${c}, ${co}. Free to join.`,
    keywords: c => [`wealthy women dating ${c}`, `wealthy women ${c}`, `affluent women ${c}`, `meet wealthy women ${c}`, `high net worth women ${c}`, `rich singles women ${c}`, `elite women ${c}`, `luxury dating women ${c}`, `premium dating ${c} women`, `established women ${c}`, `successful single women ${c}`, `rich women dating ${c}`, `women with money ${c}`, `millionaire women match ${c}`, `wealthy female singles ${c}`],
    intro: (c, co) => `Rich Dating Network is the premier platform for meeting successful, wealthy women in ${c}. These are real, verified women in ${c}, ${co} — professionals, entrepreneurs, and established individuals — who are looking for genuine companionship. Sign up free today.`,
  },
  {
    prefix: 'millionaire-dating',
    label: 'Millionaire Dating',
    h1: c => `Millionaire Dating in ${c}`,
    title: (c, co) => `Millionaire Dating ${c} | Meet Millionaires in ${c} — Rich Dating Network`,
    description: (c, co) => `Meet millionaires in ${c} on Rich Dating Network. The premier millionaire dating site in ${c}, ${co}. Verified profiles, free to join.`,
    keywords: c => [`millionaire dating ${c}`, `millionaire dating site ${c}`, `meet millionaires ${c}`, `millionaire match ${c}`, `billionaire dating ${c}`, `millionaire singles ${c}`, `date a millionaire ${c}`, `millionaire finder ${c}`, `rich partner ${c}`, `wealthy partner ${c}`, `millionaire app ${c}`, `millionaire website ${c}`, `meet a millionaire ${c}`, `millionaire romance ${c}`, `millionaire relationship ${c}`, `luxury singles ${c}`, `elite dating ${c}`, `high net worth dating ${c}`],
    intro: (c, co) => `Rich Dating Network is the #1 millionaire dating platform in ${c}. Browse verified profiles of real millionaires and high-net-worth singles in ${c}, ${co}. Whether you're a millionaire seeking a genuine partner or looking to meet one, join free today.`,
  },
  {
    prefix: 'cougar-dating',
    label: 'Cougar Dating',
    h1: c => `Cougar Dating in ${c}`,
    title: (c, co) => `Cougar Dating ${c} | Meet Older Women in ${c} — Rich Dating Network`,
    description: (c, co) => `Find cougars in ${c} for dating. Meet confident, successful older women in ${c}, ${co} on Rich Dating Network. Free to join, verified profiles.`,
    keywords: c => [`cougar dating ${c}`, `cougars in ${c}`, `meet cougars ${c}`, `older women dating ${c}`, `mature women dating ${c}`, `older women younger men ${c}`, `cougar dating site ${c}`, `cougar dating app ${c}`, `find cougars ${c}`, `cougar romance ${c}`, `mature dating ${c}`, `older women ${c}`, `milf dating ${c}`, `cougar women ${c}`, `date older women ${c}`, `experienced women ${c}`, `independent women dating ${c}`, `financially secure women ${c}`],
    intro: (c, co) => `Meet confident, successful older women in ${c} on Rich Dating Network. Our platform is home to thousands of verified mature women in ${c}, ${co} — independent, established, and looking for genuine connections. Whether you call it cougar dating or simply prefer older, experienced partners, join free today.`,
  },
  {
    prefix: 'older-men',
    label: 'Older Men Dating',
    h1: c => `Meet Older Men in ${c}`,
    title: (c, co) => `Older Men Dating ${c} | Meet Mature Men in ${c} — Rich Dating Network`,
    description: (c, co) => `Meet older, mature, successful men in ${c} on Rich Dating Network. Genuine connections, verified profiles in ${c}, ${co}. Join free.`,
    keywords: c => [`older men dating ${c}`, `older men ${c}`, `mature men ${c}`, `mature men dating ${c}`, `older men younger women ${c}`, `older men dating site ${c}`, `meet older men ${c}`, `date older men ${c}`, `experienced men ${c}`, `established older men ${c}`, `silver fox ${c}`, `distinguished men ${c}`, `mature gentleman ${c}`, `older successful men ${c}`, `older rich men ${c}`, `elderly rich men ${c}`],
    intro: (c, co) => `Looking for an older, experienced, and successful man in ${c}? Rich Dating Network connects you with verified mature men in ${c}, ${co} who offer stability, wisdom, and genuine connection. Join free and browse real profiles today.`,
  },
  {
    prefix: 'luxury-dating',
    label: 'Luxury Dating',
    h1: c => `Luxury Dating in ${c}`,
    title: (c, co) => `Luxury Dating ${c} | Elite Dating Site in ${c} — Rich Dating Network`,
    description: (c, co) => `Join the premier luxury dating site in ${c}. Meet elite, verified wealthy singles in ${c}, ${co} on Rich Dating Network. Free to join.`,
    keywords: c => [`luxury dating ${c}`, `elite dating ${c}`, `luxury dating site ${c}`, `premium dating ${c}`, `elite dating site ${c}`, `exclusive dating ${c}`, `high class dating ${c}`, `upscale dating ${c}`, `luxury singles ${c}`, `elite singles ${c}`, `affluent dating ${c}`, `vip dating ${c}`, `rich singles ${c}`, `posh dating ${c}`, `sophisticated dating ${c}`, `classy singles ${c}`, `high society dating ${c}`, `upper class dating ${c}`],
    intro: (c, co) => `Rich Dating Network is ${c}'s most exclusive luxury dating platform. Connect with verified, elite singles in ${c}, ${co} who share your ambitions, lifestyle, and standards. No time-wasters, only genuine connections. Join free today.`,
  },
]

// ── Generate all city pages ────────────────────────────────────────────────

const cityPages: SeoLandingPage[] = PLACES_LIST.flatMap(({ city, country }) => {
  const citySlug = slugify(city)
  return CATEGORIES.map(cat => ({
    slug: `${cat.prefix}-${citySlug}`,
    city,
    country,
    category: cat.label,
    h1: cat.h1(city),
    title: cat.title(city, country),
    description: cat.description(city, country),
    keywords: cat.keywords(city),
    intro: cat.intro(city, country),
  }))
})

// ── Generate country hub pages ────────────────────────────────────────────
// One page per country × category (e.g. /sugar-daddy-kenya, /rich-men-nigeria).
// These act as mid-level hubs that link down to all city pages.

const uniqueCountries = Array.from(new Set(PLACES_LIST.map(p => p.country)))

const countryPages: SeoLandingPage[] = uniqueCountries.flatMap(country => {
  const countrySlug = slugify(country)
  // Remove redundant "City, Country" → "Country" duplication in copy
  const dedup = (s: string) =>
    s.replace(new RegExp(`, ${country.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), '')
  return CATEGORIES.map(cat => ({
    slug: `${cat.prefix}-${countrySlug}`,
    country,
    category: cat.prefix,
    h1: cat.h1(country),
    title: dedup(cat.title(country, country)),
    description: dedup(cat.description(country, country)),
    keywords: cat.keywords(country),
    intro: dedup(cat.intro(country, country)),
  }))
})

// ── Generic (non-city) pages ──────────────────────────────────────────────

const genericPages: SeoLandingPage[] = [
  {
    slug: 'sugar-daddy',
    h1: 'Find a Sugar Daddy Online',
    title: 'Sugar Daddy Dating Site | Find a Real Sugar Daddy — Rich Dating Network',
    description: 'Find a genuine sugar daddy on Rich Dating Network. Free to join, verified profiles, 180+ countries. Meet wealthy, successful men ready to support and connect.',
    keywords: ['sugar daddy', 'sugar daddy dating', 'find a sugar daddy', 'sugar daddy website', 'sugar daddy app', 'sugar daddy online', 'real sugar daddy', 'genuine sugar daddy', 'sugar daddy site', 'sugar daddy dating site', 'sugar daddy near me', 'sugar daddy for free'],
    intro: 'Rich Dating Network is the world\'s most trusted sugar daddy dating platform. Thousands of verified, successful men are ready to meet you. Join free today.',
  },
  {
    slug: 'sugar-mummy',
    h1: 'Find a Sugar Mummy Online',
    title: 'Sugar Mummy Dating Site | Find a Real Sugar Mummy — Rich Dating Network',
    description: 'Find a genuine sugar mummy on Rich Dating Network. Free to join, verified profiles, 180+ countries. Meet wealthy, successful women ready to support and connect.',
    keywords: ['sugar mummy', 'sugar mummy dating', 'find a sugar mummy', 'sugar mummy website', 'sugar mummy app', 'sugar mummy online', 'real sugar mummy', 'genuine sugar mummy', 'sugar mummy site', 'sugar mummy near me', 'sugar mummy whatsapp', 'sugar mummy for free'],
    intro: 'Rich Dating Network connects ambitious singles with verified, successful women worldwide. No fake profiles, no scams — join free and meet real sugar mummies today.',
  },
  {
    slug: 'rich-men-dating',
    h1: 'Meet Rich Men Online',
    title: 'Rich Men Dating Site | Meet Wealthy Men Worldwide — Rich Dating Network',
    description: 'Meet real, verified rich men on Rich Dating Network. 180+ countries, free to join. Connect with wealthy, successful men looking for genuine relationships.',
    keywords: ['rich men dating', 'rich men dating site', 'meet rich men', 'wealthy men dating', 'wealthy men online', 'rich men near me', 'date rich men', 'find rich men', 'rich guys dating', 'wealthy guys', 'rich men app', 'millionaire men dating'],
    intro: 'Rich Dating Network is the premier platform for meeting genuine wealthy men online. Verified profiles, real connections, 180+ countries. Join free today.',
  },
  {
    slug: 'rich-women-dating',
    h1: 'Meet Rich Women Online',
    title: 'Rich Women Dating Site | Meet Wealthy Women Worldwide — Rich Dating Network',
    description: 'Meet real, verified rich women on Rich Dating Network. 180+ countries, free to join. Connect with wealthy, successful women looking for genuine relationships.',
    keywords: ['rich women dating', 'rich women dating site', 'meet rich women', 'wealthy women dating', 'wealthy women online', 'rich women near me', 'date rich women', 'find rich women', 'rich ladies dating', 'wealthy ladies', 'rich women app', 'millionaire women dating'],
    intro: 'Rich Dating Network is the premier platform for meeting genuine wealthy women online. Verified profiles, real connections, 180+ countries. Join free today.',
  },
  {
    slug: 'millionaire-dating',
    h1: 'Meet Millionaires Online',
    title: 'Millionaire Dating Site | Meet Verified Millionaires — Rich Dating Network',
    description: 'Join the top millionaire dating site. Meet verified millionaires and billionaires worldwide on Rich Dating Network. Free to join.',
    keywords: ['millionaire dating', 'millionaire dating site', 'meet a millionaire', 'billionaire dating', 'millionaire match', 'millionaire dating app', 'date a millionaire', 'millionaire singles'],
    intro: 'Rich Dating Network is the premier millionaire dating site, connecting verified high-net-worth singles worldwide. Whether you\'re a millionaire looking for genuine love or hoping to meet one, join free today.',
  },
  {
    slug: 'cougar-dating',
    h1: 'Cougar Dating — Meet Older Women Online',
    title: 'Cougar Dating Site | Meet Mature Women Worldwide — Rich Dating Network',
    description: 'Find cougars for dating on Rich Dating Network. Meet confident, successful older women worldwide. Free to join, verified profiles.',
    keywords: ['cougar dating', 'cougar dating site', 'meet cougars', 'older women dating', 'mature women dating', 'cougar dating app', 'find cougars online', 'cougar romance', 'milf dating', 'older women younger men'],
    intro: 'Rich Dating Network is a trusted cougar dating platform where confident, successful older women meet younger, ambitious singles. Join free and browse real profiles worldwide.',
  },
  {
    slug: 'luxury-dating',
    h1: 'Luxury Dating for the Affluent',
    title: 'Luxury Dating Site | Elite Dating Worldwide — Rich Dating Network',
    description: 'Join the most exclusive luxury dating site. Meet verified, affluent elite singles worldwide on Rich Dating Network. Free to join.',
    keywords: ['luxury dating', 'luxury dating site', 'elite dating', 'elite dating site', 'premium dating', 'exclusive dating', 'high class dating', 'upscale dating', 'luxury singles', 'elite singles', 'vip dating', 'affluent dating'],
    intro: 'Rich Dating Network is the premier luxury dating platform, connecting elite, successful singles worldwide. Join free today and meet your perfect match.',
  },
  {
    slug: 'seeking-arrangement',
    h1: 'Seeking a Mutually Beneficial Arrangement',
    title: 'Sugar Dating Arrangement | Mutually Beneficial Relationships — Rich Dating Network',
    description: 'Seeking a mutually beneficial arrangement? Rich Dating Network connects generous, wealthy partners with ambitious singles worldwide. Free to join.',
    keywords: ['seeking arrangement', 'mutually beneficial relationship', 'sugar dating arrangement', 'financial support dating', 'allowance dating', 'arrangement dating site', 'seeking arrangement alternative', 'sugar arrangement', 'compensated dating', 'generous partner'],
    intro: 'A mutually beneficial arrangement pairs a generous, successful partner with an ambitious companion. Rich Dating Network is a free, verified alternative for finding genuine arrangements worldwide.',
  },
  {
    slug: 'wealthy-singles',
    h1: 'Meet Wealthy Singles Near You',
    title: 'Wealthy Singles Dating | Meet Affluent Singles Worldwide — Rich Dating Network',
    description: 'Join thousands of wealthy, successful singles on Rich Dating Network. Verified profiles, real connections, free to join, available in 180+ countries.',
    keywords: ['wealthy singles', 'wealthy singles dating site', 'affluent singles', 'elite singles', 'luxury dating', 'high net worth dating', 'premium dating site', 'exclusive dating site', 'rich singles', 'meet wealthy singles', 'successful singles'],
    intro: 'Rich Dating Network brings together wealthy, ambitious, successful singles from over 180 countries. Verified profiles, real connections — free to join.',
  },
  {
    slug: 'rich-dating',
    h1: 'Rich Dating — Find Your Wealthy Match',
    title: 'Rich Dating Site | Meet Wealthy Singles Worldwide — Rich Dating Network',
    description: 'The best rich dating site. Meet verified wealthy singles for genuine relationships worldwide on Rich Dating Network. Free to join, 180+ countries.',
    keywords: ['rich dating', 'rich dating site', 'rich dating app', 'wealthy dating', 'wealthy dating site', 'rich singles dating', 'affluent dating', 'elite dating', 'date rich people', 'meet rich people', 'rich partner', 'wealthy partner', 'rich relationship'],
    intro: 'Rich Dating Network is the premier destination for finding a wealthy partner online. Join millions of members across 180+ countries and start your journey today — completely free.',
  },
]

// ── Build slug lookup map for O(1) retrieval ───────────────────────────────

const _slugMap = new Map<string, SeoLandingPage>()

export const SEO_LANDING_PAGES: SeoLandingPage[] = [
  ...genericPages,
  ...countryPages,
  ...cityPages,
]

for (const p of SEO_LANDING_PAGES) {
  _slugMap.set(p.slug, p)
}

export function getSeoLandingPage(slug: string): SeoLandingPage | undefined {
  return _slugMap.get(slug)
}

export const CATEGORY_PREFIXES = CATEGORIES.map(c => c.prefix)
export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.prefix, c.label])
)
