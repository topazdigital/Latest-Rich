export interface SeoLandingPage {
  slug: string
  h1: string
  title: string
  description: string
  keywords: string[]
  intro: string
  country?: string
  city?: string
}

interface CityDef {
  city: string
  country: string
}

const PLACES: CityDef[] = [
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
  { city: "Murang'a", country: "Kenya" },
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

  // ── Zambia ──────────────────────────────────────────────────────────────
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
  { city: "Parañaque", country: "the Philippines" },
  { city: "Caloocan", country: "the Philippines" },
  { city: "Las Piñas", country: "the Philippines" },
  { city: "Pasay", country: "the Philippines" },
  { city: "Mandaluyong", country: "the Philippines" },
  { city: "Marikina", country: "the Philippines" },
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
  { city: "Newcastle", country: "Australia" },
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

  // ── Sweden / Norway / Denmark / Finland ──────────────────────────────────
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

  // ── Bangladesh ────────────────────────────────────────────────────────────
  { city: "Dhaka", country: "Bangladesh" },
  { city: "Chittagong", country: "Bangladesh" },
  { city: "Sylhet", country: "Bangladesh" },

  // ── Sri Lanka ─────────────────────────────────────────────────────────────
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

  // ── Vietnam ───────────────────────────────────────────────────────────────
  { city: "Ho Chi Minh City", country: "Vietnam" },
  { city: "Hanoi", country: "Vietnam" },
  { city: "Da Nang", country: "Vietnam" },

  // ── Cambodia / Laos ───────────────────────────────────────────────────────
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

  // ── South Korea ───────────────────────────────────────────────────────────
  { city: "Seoul", country: "South Korea" },
  { city: "Busan", country: "South Korea" },
  { city: "Incheon", country: "South Korea" },

  // ── Taiwan ────────────────────────────────────────────────────────────────
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

  // ── Argentina ─────────────────────────────────────────────────────────────
  { city: "Buenos Aires", country: "Argentina" },
  { city: "Córdoba", country: "Argentina" },
  { city: "Rosario", country: "Argentina" },

  // ── Colombia / Chile / Peru ───────────────────────────────────────────────
  { city: "Bogotá", country: "Colombia" },
  { city: "Medellín", country: "Colombia" },
  { city: "Cali", country: "Colombia" },
  { city: "Santiago", country: "Chile" },
  { city: "Lima", country: "Peru" },

  // ── Egypt / Morocco / Tunisia / Algeria ──────────────────────────────────
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

  // ── Turkey ────────────────────────────────────────────────────────────────
  { city: "Istanbul", country: "Turkey" },
  { city: "Ankara", country: "Turkey" },
  { city: "Izmir", country: "Turkey" },
  { city: "Antalya", country: "Turkey" },

  // ── Israel ────────────────────────────────────────────────────────────────
  { city: "Tel Aviv", country: "Israel" },
  { city: "Jerusalem", country: "Israel" },

  // ── Iran / Iraq ───────────────────────────────────────────────────────────
  { city: "Tehran", country: "Iran" },
  { city: "Baghdad", country: "Iraq" },
  { city: "Erbil", country: "Iraq" },

  // ── Pakistan neighbours ───────────────────────────────────────────────────
  { city: "Kabul", country: "Afghanistan" },
]

function slugify(city: string) {
  return city
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
}

const sugarDaddyPages: SeoLandingPage[] = PLACES.map(({ city, country }) => {
  const citySlug = slugify(city)
  return {
    slug: `sugar-daddy-${citySlug}`,
    city,
    country,
    h1: `Find a Sugar Daddy in ${city}`,
    title: `Sugar Daddy ${city} | Meet Rich Sugar Daddies in ${city} — Rich Dating Network`,
    description: `Looking for a sugar daddy in ${city}? Join Rich Dating Network free and meet verified, wealthy sugar daddies in ${city}, ${country} today. Real profiles, real connections, real support.`,
    keywords: [
      `sugar daddy ${city}`, `sugar daddy in ${city}`, `find sugar daddy ${city}`, `rich men ${city}`,
      `wealthy men ${city}`, `sugar daddy website ${city}`, `sugar daddy app ${city}`, `how to find a sugar daddy in ${city}`,
      `sugar daddy for free ${city}`, `genuine sugar daddy ${city}`, `sugar daddy dating site ${city}`,
    ],
    intro: `Thousands of successful, wealthy men in ${city} are ready to meet you on Rich Dating Network. Whether you're searching for a genuine sugar daddy who offers financial support, mentorship, and a comfortable lifestyle, or simply want to meet affluent, ambitious men in ${city}, our platform makes it safe and easy. Create your free profile, get verified, and start chatting with real sugar daddies in ${city} today.`,
  }
})

const sugarMummyPages: SeoLandingPage[] = PLACES.map(({ city, country }) => {
  const citySlug = slugify(city)
  return {
    slug: `sugar-mummy-${citySlug}`,
    city,
    country,
    h1: `Find a Sugar Mummy in ${city}`,
    title: `Sugar Mummy ${city} | Meet Rich Sugar Mummies in ${city} — Rich Dating Network`,
    description: `Looking for a sugar mummy in ${city}? Join Rich Dating Network free and meet verified, wealthy sugar mummies in ${city}, ${country} today. Real profiles, real connections, real support.`,
    keywords: [
      `sugar mummy ${city}`, `sugar mummy in ${city}`, `find sugar mummy ${city}`, `rich women ${city}`,
      `wealthy women ${city}`, `sugar mummy website ${city}`, `sugar mummy app ${city}`, `how to find a sugar mummy in ${city}`,
      `sugar mummy whatsapp ${city}`, `genuine sugar mummy ${city}`, `sugar mummy dating site ${city}`,
      `sugar mummy contacts ${city}`, `sugar mummy hookup ${city}`,
    ],
    intro: `Meet real, verified sugar mummies in ${city} on Rich Dating Network. Our platform connects ambitious singles with successful, wealthy women in ${city}, ${country} who are looking for genuine companionship and are willing to support the right partner. No scams, no fake profiles — just real women in ${city} ready to connect. Sign up free today.`,
  }
})

const genericPages: SeoLandingPage[] = [
  {
    slug: "sugar-daddy",
    h1: "Find a Sugar Daddy Online",
    title: "Sugar Daddy Dating Site | Find a Real Sugar Daddy — Rich Dating Network",
    description: "Find a genuine sugar daddy on Rich Dating Network. Free to join, verified profiles, 180+ countries. Meet wealthy, successful men ready to support and connect.",
    keywords: ["sugar daddy", "sugar daddy dating", "find a sugar daddy", "sugar daddy website", "sugar daddy app", "sugar daddy online", "real sugar daddy", "genuine sugar daddy"],
    intro: "Rich Dating Network is the world's most trusted sugar daddy dating platform. Thousands of verified, successful men are ready to meet you. Join free today.",
  },
  {
    slug: "sugar-mummy",
    h1: "Find a Sugar Mummy Online",
    title: "Sugar Mummy Dating Site | Find a Real Sugar Mummy — Rich Dating Network",
    description: "Find a genuine sugar mummy on Rich Dating Network. Free to join, verified profiles, 180+ countries. Meet wealthy, successful women ready to support and connect.",
    keywords: ["sugar mummy", "sugar mummy dating", "find a sugar mummy", "sugar mummy website", "sugar mummy app", "sugar mummy online", "real sugar mummy", "genuine sugar mummy"],
    intro: "Rich Dating Network connects ambitious singles with verified, successful women worldwide. No fake profiles, no scams — join free and meet real sugar mummies today.",
  },
  {
    slug: "rich-dating",
    h1: "Luxury Dating for the Affluent",
    title: "Rich Dating Site | Meet Wealthy Singles Worldwide — Rich Dating Network",
    description: "Join the most exclusive rich dating site. Meet verified, affluent singles worldwide looking for real relationships on Rich Dating Network. Free to join.",
    keywords: ["rich dating", "rich dating site", "wealthy dating", "luxury dating", "elite dating", "affluent singles", "rich singles dating", "high class dating"],
    intro: "Rich Dating Network is the premier luxury dating platform, connecting wealthy, successful singles worldwide. Join free today and meet your perfect match.",
  },
  {
    slug: "millionaire-dating",
    h1: "Meet Millionaires Online",
    title: "Millionaire Dating Site | Meet Verified Millionaires — Rich Dating Network",
    description: "Join the top millionaire dating site. Meet verified millionaires and billionaires worldwide looking for real relationships on Rich Dating Network. Free to join.",
    keywords: ["millionaire dating", "millionaire dating site", "meet a millionaire", "billionaire dating", "millionaire match", "millionaire dating app", "date a millionaire", "millionaire singles"],
    intro: "Rich Dating Network is the premier millionaire dating site, connecting verified high-net-worth singles worldwide. Whether you're a millionaire looking for genuine love or hoping to meet one, join free today.",
  },
  {
    slug: "seeking-arrangement",
    h1: "Seeking a Mutually Beneficial Arrangement",
    title: "Sugar Dating Arrangement | Mutually Beneficial Relationships — Rich Dating Network",
    description: "Seeking a mutually beneficial arrangement? Rich Dating Network connects generous, wealthy partners with ambitious singles worldwide, free to join.",
    keywords: ["seeking arrangement", "mutually beneficial relationship", "sugar dating arrangement", "financial support dating", "allowance dating", "arrangement dating site", "seeking arrangement alternative"],
    intro: "A mutually beneficial arrangement pairs a generous, successful partner with an ambitious companion — clear expectations, real benefits. Rich Dating Network is a free, verified alternative for finding genuine sugar dating arrangements worldwide.",
  },
  {
    slug: "wealthy-singles",
    h1: "Meet Wealthy Singles Near You",
    title: "Wealthy Singles Dating | Meet Affluent Singles Worldwide — Rich Dating Network",
    description: "Join thousands of wealthy, successful singles on Rich Dating Network. Verified profiles, real connections, free to join, available in 180+ countries.",
    keywords: ["wealthy singles", "wealthy singles dating site", "affluent singles", "elite singles", "luxury dating", "high net worth dating", "premium dating site", "exclusive dating site"],
    intro: "Rich Dating Network brings together wealthy, ambitious, successful singles from over 180 countries. Verified profiles, real connections, and a safe way to meet the affluent partner you've been looking for — free to join.",
  },
]

export const SEO_LANDING_PAGES: SeoLandingPage[] = [
  ...genericPages,
  ...sugarDaddyPages,
  ...sugarMummyPages,
]

export function getSeoLandingPage(slug: string): SeoLandingPage | undefined {
  return SEO_LANDING_PAGES.find(p => p.slug === slug)
}

export const PLACES_LIST = PLACES
