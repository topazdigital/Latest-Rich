import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable } from "@workspace/db/schema"
import { sql } from "drizzle-orm"

const router = Router()

const POPULAR_CITIES = [
  { city: "New York", country: "United States", countryCode: "US" },
  { city: "Los Angeles", country: "United States", countryCode: "US" },
  { city: "Chicago", country: "United States", countryCode: "US" },
  { city: "Houston", country: "United States", countryCode: "US" },
  { city: "Phoenix", country: "United States", countryCode: "US" },
  { city: "Philadelphia", country: "United States", countryCode: "US" },
  { city: "San Antonio", country: "United States", countryCode: "US" },
  { city: "San Diego", country: "United States", countryCode: "US" },
  { city: "Dallas", country: "United States", countryCode: "US" },
  { city: "San Jose", country: "United States", countryCode: "US" },
  { city: "Austin", country: "United States", countryCode: "US" },
  { city: "Jacksonville", country: "United States", countryCode: "US" },
  { city: "San Francisco", country: "United States", countryCode: "US" },
  { city: "Columbus", country: "United States", countryCode: "US" },
  { city: "Charlotte", country: "United States", countryCode: "US" },
  { city: "Miami", country: "United States", countryCode: "US" },
  { city: "Seattle", country: "United States", countryCode: "US" },
  { city: "Denver", country: "United States", countryCode: "US" },
  { city: "Nashville", country: "United States", countryCode: "US" },
  { city: "Atlanta", country: "United States", countryCode: "US" },
  { city: "Boston", country: "United States", countryCode: "US" },
  { city: "Las Vegas", country: "United States", countryCode: "US" },
  { city: "Portland", country: "United States", countryCode: "US" },
  { city: "Detroit", country: "United States", countryCode: "US" },
  { city: "Minneapolis", country: "United States", countryCode: "US" },
  { city: "Tampa", country: "United States", countryCode: "US" },
  { city: "Orlando", country: "United States", countryCode: "US" },
  { city: "Sacramento", country: "United States", countryCode: "US" },
  { city: "Baltimore", country: "United States", countryCode: "US" },
  { city: "Salt Lake City", country: "United States", countryCode: "US" },
  { city: "Pittsburgh", country: "United States", countryCode: "US" },
  { city: "Richmond", country: "United States", countryCode: "US" },
  { city: "Cincinnati", country: "United States", countryCode: "US" },
  { city: "Kansas City", country: "United States", countryCode: "US" },
  { city: "Indianapolis", country: "United States", countryCode: "US" },
  { city: "Cleveland", country: "United States", countryCode: "US" },
  { city: "Memphis", country: "United States", countryCode: "US" },
  { city: "Louisville", country: "United States", countryCode: "US" },
  { city: "New Orleans", country: "United States", countryCode: "US" },
  { city: "London", country: "United Kingdom", countryCode: "GB" },
  { city: "Manchester", country: "United Kingdom", countryCode: "GB" },
  { city: "Birmingham", country: "United Kingdom", countryCode: "GB" },
  { city: "Liverpool", country: "United Kingdom", countryCode: "GB" },
  { city: "Leeds", country: "United Kingdom", countryCode: "GB" },
  { city: "Glasgow", country: "United Kingdom", countryCode: "GB" },
  { city: "Edinburgh", country: "United Kingdom", countryCode: "GB" },
  { city: "Bristol", country: "United Kingdom", countryCode: "GB" },
  { city: "Sheffield", country: "United Kingdom", countryCode: "GB" },
  { city: "Nottingham", country: "United Kingdom", countryCode: "GB" },
  { city: "Leicester", country: "United Kingdom", countryCode: "GB" },
  { city: "Coventry", country: "United Kingdom", countryCode: "GB" },
  { city: "Bradford", country: "United Kingdom", countryCode: "GB" },
  { city: "Cardiff", country: "United Kingdom", countryCode: "GB" },
  { city: "Belfast", country: "United Kingdom", countryCode: "GB" },
  { city: "Toronto", country: "Canada", countryCode: "CA" },
  { city: "Vancouver", country: "Canada", countryCode: "CA" },
  { city: "Montreal", country: "Canada", countryCode: "CA" },
  { city: "Calgary", country: "Canada", countryCode: "CA" },
  { city: "Ottawa", country: "Canada", countryCode: "CA" },
  { city: "Edmonton", country: "Canada", countryCode: "CA" },
  { city: "Winnipeg", country: "Canada", countryCode: "CA" },
  { city: "Quebec City", country: "Canada", countryCode: "CA" },
  { city: "Hamilton", country: "Canada", countryCode: "CA" },
  { city: "Sydney", country: "Australia", countryCode: "AU" },
  { city: "Melbourne", country: "Australia", countryCode: "AU" },
  { city: "Brisbane", country: "Australia", countryCode: "AU" },
  { city: "Perth", country: "Australia", countryCode: "AU" },
  { city: "Adelaide", country: "Australia", countryCode: "AU" },
  { city: "Gold Coast", country: "Australia", countryCode: "AU" },
  { city: "Canberra", country: "Australia", countryCode: "AU" },
  { city: "Nairobi", country: "Kenya", countryCode: "KE" },
  { city: "Mombasa", country: "Kenya", countryCode: "KE" },
  { city: "Kisumu", country: "Kenya", countryCode: "KE" },
  { city: "Nakuru", country: "Kenya", countryCode: "KE" },
  { city: "Eldoret", country: "Kenya", countryCode: "KE" },
  { city: "Thika", country: "Kenya", countryCode: "KE" },
  { city: "Malindi", country: "Kenya", countryCode: "KE" },
  { city: "Kitale", country: "Kenya", countryCode: "KE" },
  { city: "Garissa", country: "Kenya", countryCode: "KE" },
  { city: "Lagos", country: "Nigeria", countryCode: "NG" },
  { city: "Abuja", country: "Nigeria", countryCode: "NG" },
  { city: "Kano", country: "Nigeria", countryCode: "NG" },
  { city: "Port Harcourt", country: "Nigeria", countryCode: "NG" },
  { city: "Ibadan", country: "Nigeria", countryCode: "NG" },
  { city: "Benin City", country: "Nigeria", countryCode: "NG" },
  { city: "Kaduna", country: "Nigeria", countryCode: "NG" },
  { city: "Enugu", country: "Nigeria", countryCode: "NG" },
  { city: "Onitsha", country: "Nigeria", countryCode: "NG" },
  { city: "Aba", country: "Nigeria", countryCode: "NG" },
  { city: "Cape Town", country: "South Africa", countryCode: "ZA" },
  { city: "Johannesburg", country: "South Africa", countryCode: "ZA" },
  { city: "Durban", country: "South Africa", countryCode: "ZA" },
  { city: "Pretoria", country: "South Africa", countryCode: "ZA" },
  { city: "Port Elizabeth", country: "South Africa", countryCode: "ZA" },
  { city: "East London", country: "South Africa", countryCode: "ZA" },
  { city: "Bloemfontein", country: "South Africa", countryCode: "ZA" },
  { city: "Polokwane", country: "South Africa", countryCode: "ZA" },
  { city: "Berlin", country: "Germany", countryCode: "DE" },
  { city: "Hamburg", country: "Germany", countryCode: "DE" },
  { city: "Munich", country: "Germany", countryCode: "DE" },
  { city: "Cologne", country: "Germany", countryCode: "DE" },
  { city: "Frankfurt", country: "Germany", countryCode: "DE" },
  { city: "Stuttgart", country: "Germany", countryCode: "DE" },
  { city: "Düsseldorf", country: "Germany", countryCode: "DE" },
  { city: "Dortmund", country: "Germany", countryCode: "DE" },
  { city: "Paris", country: "France", countryCode: "FR" },
  { city: "Lyon", country: "France", countryCode: "FR" },
  { city: "Marseille", country: "France", countryCode: "FR" },
  { city: "Toulouse", country: "France", countryCode: "FR" },
  { city: "Nice", country: "France", countryCode: "FR" },
  { city: "Bordeaux", country: "France", countryCode: "FR" },
  { city: "Strasbourg", country: "France", countryCode: "FR" },
  { city: "Mumbai", country: "India", countryCode: "IN" },
  { city: "Delhi", country: "India", countryCode: "IN" },
  { city: "Bangalore", country: "India", countryCode: "IN" },
  { city: "Hyderabad", country: "India", countryCode: "IN" },
  { city: "Chennai", country: "India", countryCode: "IN" },
  { city: "Kolkata", country: "India", countryCode: "IN" },
  { city: "Pune", country: "India", countryCode: "IN" },
  { city: "Ahmedabad", country: "India", countryCode: "IN" },
  { city: "Jaipur", country: "India", countryCode: "IN" },
  { city: "Surat", country: "India", countryCode: "IN" },
  { city: "Lucknow", country: "India", countryCode: "IN" },
  { city: "Kanpur", country: "India", countryCode: "IN" },
  { city: "Nagpur", country: "India", countryCode: "IN" },
  { city: "Indore", country: "India", countryCode: "IN" },
  { city: "Bhopal", country: "India", countryCode: "IN" },
  { city: "Visakhapatnam", country: "India", countryCode: "IN" },
  { city: "Patna", country: "India", countryCode: "IN" },
  { city: "Vadodara", country: "India", countryCode: "IN" },
  { city: "São Paulo", country: "Brazil", countryCode: "BR" },
  { city: "Rio de Janeiro", country: "Brazil", countryCode: "BR" },
  { city: "Brasília", country: "Brazil", countryCode: "BR" },
  { city: "Salvador", country: "Brazil", countryCode: "BR" },
  { city: "Fortaleza", country: "Brazil", countryCode: "BR" },
  { city: "Manaus", country: "Brazil", countryCode: "BR" },
  { city: "Curitiba", country: "Brazil", countryCode: "BR" },
  { city: "Recife", country: "Brazil", countryCode: "BR" },
  { city: "Mexico City", country: "Mexico", countryCode: "MX" },
  { city: "Guadalajara", country: "Mexico", countryCode: "MX" },
  { city: "Monterrey", country: "Mexico", countryCode: "MX" },
  { city: "Cancún", country: "Mexico", countryCode: "MX" },
  { city: "Tijuana", country: "Mexico", countryCode: "MX" },
  { city: "Madrid", country: "Spain", countryCode: "ES" },
  { city: "Barcelona", country: "Spain", countryCode: "ES" },
  { city: "Valencia", country: "Spain", countryCode: "ES" },
  { city: "Seville", country: "Spain", countryCode: "ES" },
  { city: "Bilbao", country: "Spain", countryCode: "ES" },
  { city: "Rome", country: "Italy", countryCode: "IT" },
  { city: "Milan", country: "Italy", countryCode: "IT" },
  { city: "Naples", country: "Italy", countryCode: "IT" },
  { city: "Turin", country: "Italy", countryCode: "IT" },
  { city: "Florence", country: "Italy", countryCode: "IT" },
  { city: "Amsterdam", country: "Netherlands", countryCode: "NL" },
  { city: "Rotterdam", country: "Netherlands", countryCode: "NL" },
  { city: "The Hague", country: "Netherlands", countryCode: "NL" },
  { city: "Utrecht", country: "Netherlands", countryCode: "NL" },
  { city: "Stockholm", country: "Sweden", countryCode: "SE" },
  { city: "Gothenburg", country: "Sweden", countryCode: "SE" },
  { city: "Malmö", country: "Sweden", countryCode: "SE" },
  { city: "Oslo", country: "Norway", countryCode: "NO" },
  { city: "Bergen", country: "Norway", countryCode: "NO" },
  { city: "Copenhagen", country: "Denmark", countryCode: "DK" },
  { city: "Aarhus", country: "Denmark", countryCode: "DK" },
  { city: "Helsinki", country: "Finland", countryCode: "FI" },
  { city: "Zurich", country: "Switzerland", countryCode: "CH" },
  { city: "Geneva", country: "Switzerland", countryCode: "CH" },
  { city: "Tokyo", country: "Japan", countryCode: "JP" },
  { city: "Osaka", country: "Japan", countryCode: "JP" },
  { city: "Yokohama", country: "Japan", countryCode: "JP" },
  { city: "Nagoya", country: "Japan", countryCode: "JP" },
  { city: "Sapporo", country: "Japan", countryCode: "JP" },
  { city: "Seoul", country: "South Korea", countryCode: "KR" },
  { city: "Busan", country: "South Korea", countryCode: "KR" },
  { city: "Incheon", country: "South Korea", countryCode: "KR" },
  { city: "Singapore", country: "Singapore", countryCode: "SG" },
  { city: "Dubai", country: "UAE", countryCode: "AE" },
  { city: "Abu Dhabi", country: "UAE", countryCode: "AE" },
  { city: "Sharjah", country: "UAE", countryCode: "AE" },
  { city: "Riyadh", country: "Saudi Arabia", countryCode: "SA" },
  { city: "Jeddah", country: "Saudi Arabia", countryCode: "SA" },
  { city: "Mecca", country: "Saudi Arabia", countryCode: "SA" },
  { city: "Cairo", country: "Egypt", countryCode: "EG" },
  { city: "Alexandria", country: "Egypt", countryCode: "EG" },
  { city: "Giza", country: "Egypt", countryCode: "EG" },
  { city: "Casablanca", country: "Morocco", countryCode: "MA" },
  { city: "Rabat", country: "Morocco", countryCode: "MA" },
  { city: "Marrakech", country: "Morocco", countryCode: "MA" },
  { city: "Fes", country: "Morocco", countryCode: "MA" },
  { city: "Accra", country: "Ghana", countryCode: "GH" },
  { city: "Kumasi", country: "Ghana", countryCode: "GH" },
  { city: "Dar es Salaam", country: "Tanzania", countryCode: "TZ" },
  { city: "Dodoma", country: "Tanzania", countryCode: "TZ" },
  { city: "Arusha", country: "Tanzania", countryCode: "TZ" },
  { city: "Kampala", country: "Uganda", countryCode: "UG" },
  { city: "Gulu", country: "Uganda", countryCode: "UG" },
  { city: "Addis Ababa", country: "Ethiopia", countryCode: "ET" },
  { city: "Dire Dawa", country: "Ethiopia", countryCode: "ET" },
  { city: "Kigali", country: "Rwanda", countryCode: "RW" },
  { city: "Lusaka", country: "Zambia", countryCode: "ZM" },
  { city: "Harare", country: "Zimbabwe", countryCode: "ZW" },
  { city: "Maputo", country: "Mozambique", countryCode: "MZ" },
  { city: "Luanda", country: "Angola", countryCode: "AO" },
  { city: "Dakar", country: "Senegal", countryCode: "SN" },
  { city: "Douala", country: "Cameroon", countryCode: "CM" },
  { city: "Yaoundé", country: "Cameroon", countryCode: "CM" },
  { city: "Abidjan", country: "Ivory Coast", countryCode: "CI" },
  { city: "Conakry", country: "Guinea", countryCode: "GN" },
  { city: "Kinshasa", country: "DRC", countryCode: "CD" },
  { city: "Antananarivo", country: "Madagascar", countryCode: "MG" },
  { city: "Jakarta", country: "Indonesia", countryCode: "ID" },
  { city: "Surabaya", country: "Indonesia", countryCode: "ID" },
  { city: "Bandung", country: "Indonesia", countryCode: "ID" },
  { city: "Medan", country: "Indonesia", countryCode: "ID" },
  { city: "Manila", country: "Philippines", countryCode: "PH" },
  { city: "Cebu", country: "Philippines", countryCode: "PH" },
  { city: "Davao", country: "Philippines", countryCode: "PH" },
  { city: "Bangkok", country: "Thailand", countryCode: "TH" },
  { city: "Chiang Mai", country: "Thailand", countryCode: "TH" },
  { city: "Pattaya", country: "Thailand", countryCode: "TH" },
  { city: "Ho Chi Minh City", country: "Vietnam", countryCode: "VN" },
  { city: "Hanoi", country: "Vietnam", countryCode: "VN" },
  { city: "Da Nang", country: "Vietnam", countryCode: "VN" },
  { city: "Kuala Lumpur", country: "Malaysia", countryCode: "MY" },
  { city: "George Town", country: "Malaysia", countryCode: "MY" },
  { city: "Johor Bahru", country: "Malaysia", countryCode: "MY" },
  { city: "Karachi", country: "Pakistan", countryCode: "PK" },
  { city: "Lahore", country: "Pakistan", countryCode: "PK" },
  { city: "Islamabad", country: "Pakistan", countryCode: "PK" },
  { city: "Faisalabad", country: "Pakistan", countryCode: "PK" },
  { city: "Dhaka", country: "Bangladesh", countryCode: "BD" },
  { city: "Chittagong", country: "Bangladesh", countryCode: "BD" },
  { city: "Colombo", country: "Sri Lanka", countryCode: "LK" },
  { city: "Kathmandu", country: "Nepal", countryCode: "NP" },
  { city: "Kathmandu", country: "Nepal", countryCode: "NP" },
  { city: "Istanbul", country: "Turkey", countryCode: "TR" },
  { city: "Ankara", country: "Turkey", countryCode: "TR" },
  { city: "Izmir", country: "Turkey", countryCode: "TR" },
  { city: "Warsaw", country: "Poland", countryCode: "PL" },
  { city: "Kraków", country: "Poland", countryCode: "PL" },
  { city: "Wrocław", country: "Poland", countryCode: "PL" },
  { city: "Prague", country: "Czech Republic", countryCode: "CZ" },
  { city: "Brno", country: "Czech Republic", countryCode: "CZ" },
  { city: "Vienna", country: "Austria", countryCode: "AT" },
  { city: "Budapest", country: "Hungary", countryCode: "HU" },
  { city: "Bucharest", country: "Romania", countryCode: "RO" },
  { city: "Athens", country: "Greece", countryCode: "GR" },
  { city: "Thessaloniki", country: "Greece", countryCode: "GR" },
  { city: "Lisbon", country: "Portugal", countryCode: "PT" },
  { city: "Porto", country: "Portugal", countryCode: "PT" },
  { city: "Brussels", country: "Belgium", countryCode: "BE" },
  { city: "Antwerp", country: "Belgium", countryCode: "BE" },
  { city: "Kyiv", country: "Ukraine", countryCode: "UA" },
  { city: "Kharkiv", country: "Ukraine", countryCode: "UA" },
  { city: "Moscow", country: "Russia", countryCode: "RU" },
  { city: "St. Petersburg", country: "Russia", countryCode: "RU" },
  { city: "Novosibirsk", country: "Russia", countryCode: "RU" },
  { city: "Tel Aviv", country: "Israel", countryCode: "IL" },
  { city: "Jerusalem", country: "Israel", countryCode: "IL" },
  { city: "Beijing", country: "China", countryCode: "CN" },
  { city: "Shanghai", country: "China", countryCode: "CN" },
  { city: "Guangzhou", country: "China", countryCode: "CN" },
  { city: "Shenzhen", country: "China", countryCode: "CN" },
  { city: "Chengdu", country: "China", countryCode: "CN" },
  { city: "Wuhan", country: "China", countryCode: "CN" },
  { city: "Chongqing", country: "China", countryCode: "CN" },
  { city: "Xi'an", country: "China", countryCode: "CN" },
  { city: "Auckland", country: "New Zealand", countryCode: "NZ" },
  { city: "Wellington", country: "New Zealand", countryCode: "NZ" },
  { city: "Christchurch", country: "New Zealand", countryCode: "NZ" },
  { city: "Buenos Aires", country: "Argentina", countryCode: "AR" },
  { city: "Córdoba", country: "Argentina", countryCode: "AR" },
  { city: "Lima", country: "Peru", countryCode: "PE" },
  { city: "Bogotá", country: "Colombia", countryCode: "CO" },
  { city: "Medellín", country: "Colombia", countryCode: "CO" },
  { city: "Cali", country: "Colombia", countryCode: "CO" },
  { city: "Santiago", country: "Chile", countryCode: "CL" },
  { city: "Quito", country: "Ecuador", countryCode: "EC" },
  { city: "Caracas", country: "Venezuela", countryCode: "VE" },
  { city: "Havana", country: "Cuba", countryCode: "CU" },
  { city: "Santo Domingo", country: "Dominican Republic", countryCode: "DO" },
  { city: "San Juan", country: "Puerto Rico", countryCode: "PR" },
  { city: "Amman", country: "Jordan", countryCode: "JO" },
  { city: "Beirut", country: "Lebanon", countryCode: "LB" },
  { city: "Baghdad", country: "Iraq", countryCode: "IQ" },
  { city: "Tehran", country: "Iran", countryCode: "IR" },
  { city: "Kabul", country: "Afghanistan", countryCode: "AF" },
  { city: "Tashkent", country: "Uzbekistan", countryCode: "UZ" },
  { city: "Almaty", country: "Kazakhstan", countryCode: "KZ" },
  { city: "Baku", country: "Azerbaijan", countryCode: "AZ" },
  { city: "Yerevan", country: "Armenia", countryCode: "AM" },
  { city: "Tbilisi", country: "Georgia", countryCode: "GE" },
  { city: "Minsk", country: "Belarus", countryCode: "BY" },
  { city: "Riga", country: "Latvia", countryCode: "LV" },
  { city: "Tallinn", country: "Estonia", countryCode: "EE" },
  { city: "Vilnius", country: "Lithuania", countryCode: "LT" },
  { city: "Sofia", country: "Bulgaria", countryCode: "BG" },
  { city: "Zagreb", country: "Croatia", countryCode: "HR" },
  { city: "Belgrade", country: "Serbia", countryCode: "RS" },
  { city: "Sarajevo", country: "Bosnia and Herzegovina", countryCode: "BA" },
  { city: "Skopje", country: "North Macedonia", countryCode: "MK" },
  { city: "Tirana", country: "Albania", countryCode: "AL" },
  { city: "Valletta", country: "Malta", countryCode: "MT" },
  { city: "Nicosia", country: "Cyprus", countryCode: "CY" },
  { city: "Reykjavik", country: "Iceland", countryCode: "IS" },
  { city: "Dublin", country: "Ireland", countryCode: "IE" },
  { city: "Cork", country: "Ireland", countryCode: "IE" },
  { city: "Luxembourg City", country: "Luxembourg", countryCode: "LU" },
  { city: "Bern", country: "Switzerland", countryCode: "CH" },
  { city: "Basel", country: "Switzerland", countryCode: "CH" },
  { city: "Tunis", country: "Tunisia", countryCode: "TN" },
  { city: "Algiers", country: "Algeria", countryCode: "DZ" },
  { city: "Tripoli", country: "Libya", countryCode: "LY" },
  { city: "Khartoum", country: "Sudan", countryCode: "SD" },
  { city: "Mogadishu", country: "Somalia", countryCode: "SO" },
  { city: "Djibouti", country: "Djibouti", countryCode: "DJ" },
  { city: "Bamako", country: "Mali", countryCode: "ML" },
  { city: "Ouagadougou", country: "Burkina Faso", countryCode: "BF" },
  { city: "Niamey", country: "Niger", countryCode: "NE" },
  { city: "N'Djamena", country: "Chad", countryCode: "TD" },
  { city: "Bangui", country: "Central African Republic", countryCode: "CF" },
  { city: "Brazzaville", country: "Republic of the Congo", countryCode: "CG" },
  { city: "Libreville", country: "Gabon", countryCode: "GA" },
  { city: "Malabo", country: "Equatorial Guinea", countryCode: "GQ" },
  { city: "Lomé", country: "Togo", countryCode: "TG" },
  { city: "Cotonou", country: "Benin", countryCode: "BJ" },
  { city: "Porto-Novo", country: "Benin", countryCode: "BJ" },
  { city: "Freetown", country: "Sierra Leone", countryCode: "SL" },
  { city: "Monrovia", country: "Liberia", countryCode: "LR" },
  { city: "Bissau", country: "Guinea-Bissau", countryCode: "GW" },
  { city: "Banjul", country: "Gambia", countryCode: "GM" },
  { city: "Praia", country: "Cape Verde", countryCode: "CV" },
  { city: "Colombo", country: "Sri Lanka", countryCode: "LK" },
  { city: "Ulaanbaatar", country: "Mongolia", countryCode: "MN" },
  { city: "Phnom Penh", country: "Cambodia", countryCode: "KH" },
  { city: "Vientiane", country: "Laos", countryCode: "LA" },
  { city: "Yangon", country: "Myanmar", countryCode: "MM" },
  { city: "Naypyidaw", country: "Myanmar", countryCode: "MM" },
  { city: "Kathmandu", country: "Nepal", countryCode: "NP" },
  { city: "Thimphu", country: "Bhutan", countryCode: "BT" },
  { city: "Dhaka", country: "Bangladesh", countryCode: "BD" },
  { city: "Male", country: "Maldives", countryCode: "MV" },
  { city: "Port Louis", country: "Mauritius", countryCode: "MU" },
  { city: "Antananarivo", country: "Madagascar", countryCode: "MG" },
]

// Simple in-memory cache for Nominatim results
const nominatimCache = new Map<string, { city: string; country: string; countryCode: string }[]>()

async function searchNominatim(q: string): Promise<{ city: string; country: string; countryCode: string }[]> {
  const cacheKey = q.toLowerCase()
  if (nominatimCache.has(cacheKey)) return nominatimCache.get(cacheKey)!

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=10&featuretype=city`
    const resp = await fetch(url, {
      headers: { "User-Agent": "RichDatingNetwork/1.0 (contact@richdating.net)" },
      signal: AbortSignal.timeout(4000),
    })
    if (!resp.ok) return []
    const data = await resp.json() as any[]
    const results: { city: string; country: string; countryCode: string }[] = []

    for (const item of data) {
      const addr = item.address || {}
      const cityName = addr.city || addr.town || addr.village || addr.municipality || addr.county
      const countryName = addr.country || ""
      const countryCode = (addr.country_code || "").toUpperCase()
      if (cityName && countryName) {
        results.push({ city: cityName, country: countryName, countryCode })
      }
    }

    const unique = Array.from(new Map(results.map(r => [`${r.city}||${r.country}`, r])).values()).slice(0, 8)
    nominatimCache.set(cacheKey, unique)
    // Expire cache after 1 hour
    setTimeout(() => nominatimCache.delete(cacheKey), 3600000)
    return unique
  } catch {
    return []
  }
}

// Detect user's country from IP
router.get("/detect", async (req, res) => {
  try {
    // Get the real IP (behind proxy/Replit)
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] as string ||
      req.socket.remoteAddress || ""

    // Skip private/local IPs
    const isPrivate = !ip || ip === "127.0.0.1" || ip.startsWith("10.") ||
      ip.startsWith("192.168.") || ip.startsWith("172.") || ip === "::1"

    if (isPrivate) {
      res.json({ country: "", countryCode: "", city: "" })
      return
    }

    const resp = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(3000),
      headers: { "User-Agent": "RichDatingNetwork/1.0" }
    })
    if (!resp.ok) { res.json({ country: "", countryCode: "", city: "" }); return }
    const data = await resp.json() as any
    res.json({
      country: data.country_name || "",
      countryCode: data.country_code || "",
      city: data.city || "",
    })
  } catch {
    res.json({ country: "", countryCode: "", city: "" })
  }
})

router.get("/autocomplete", async (req, res) => {
  try {
    const q = String(req.query.q || "").toLowerCase().trim()
    if (!q || q.length < 2) { res.json([]); return }

    // First check DB for cities users have entered
    const dbCities = await db.selectDistinct({ city: usersTable.city, country: usersTable.country })
      .from(usersTable)
      .where(sql`LOWER(${usersTable.city}) LIKE ${`%${q}%`}`)
      .limit(10)

    // Match from popular cities list
    const staticMatches = POPULAR_CITIES
      .filter(c => c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
      .slice(0, 15)

    // Merge, deduplicate
    const combined = new Map<string, { city: string; country: string; countryCode?: string }>()
    for (const r of dbCities) {
      if (r.city) combined.set(`${r.city}||${r.country}`, { city: r.city, country: r.country || "" })
    }
    for (const c of staticMatches) {
      combined.set(`${c.city}||${c.country}`, c)
    }

    let results = Array.from(combined.values())
      .filter(c => c.city.toLowerCase().includes(q))
      .slice(0, 10)

    // If not enough local matches, try Nominatim for worldwide coverage
    if (results.length < 3 && q.length >= 3) {
      const nominatimResults = await searchNominatim(q)
      for (const nr of nominatimResults) {
        const key = `${nr.city}||${nr.country}`
        if (!combined.has(key)) {
          combined.set(key, nr)
          results.push(nr)
        }
      }
      results = results.slice(0, 10)
    }

    res.json(results)
  } catch (err) {
    res.json([])
  }
})

export default router
