import { Router } from "express"
import { db } from "@workspace/db"
import { usersTable } from "@workspace/db/schema"
import { sql } from "drizzle-orm"

const router = Router()

// Popular cities for autocomplete
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
  { city: "London", country: "United Kingdom", countryCode: "GB" },
  { city: "Manchester", country: "United Kingdom", countryCode: "GB" },
  { city: "Birmingham", country: "United Kingdom", countryCode: "GB" },
  { city: "Liverpool", country: "United Kingdom", countryCode: "GB" },
  { city: "Leeds", country: "United Kingdom", countryCode: "GB" },
  { city: "Glasgow", country: "United Kingdom", countryCode: "GB" },
  { city: "Edinburgh", country: "United Kingdom", countryCode: "GB" },
  { city: "Bristol", country: "United Kingdom", countryCode: "GB" },
  { city: "Toronto", country: "Canada", countryCode: "CA" },
  { city: "Vancouver", country: "Canada", countryCode: "CA" },
  { city: "Montreal", country: "Canada", countryCode: "CA" },
  { city: "Calgary", country: "Canada", countryCode: "CA" },
  { city: "Ottawa", country: "Canada", countryCode: "CA" },
  { city: "Edmonton", country: "Canada", countryCode: "CA" },
  { city: "Sydney", country: "Australia", countryCode: "AU" },
  { city: "Melbourne", country: "Australia", countryCode: "AU" },
  { city: "Brisbane", country: "Australia", countryCode: "AU" },
  { city: "Perth", country: "Australia", countryCode: "AU" },
  { city: "Adelaide", country: "Australia", countryCode: "AU" },
  { city: "Nairobi", country: "Kenya", countryCode: "KE" },
  { city: "Mombasa", country: "Kenya", countryCode: "KE" },
  { city: "Kisumu", country: "Kenya", countryCode: "KE" },
  { city: "Lagos", country: "Nigeria", countryCode: "NG" },
  { city: "Abuja", country: "Nigeria", countryCode: "NG" },
  { city: "Kano", country: "Nigeria", countryCode: "NG" },
  { city: "Port Harcourt", country: "Nigeria", countryCode: "NG" },
  { city: "Cape Town", country: "South Africa", countryCode: "ZA" },
  { city: "Johannesburg", country: "South Africa", countryCode: "ZA" },
  { city: "Durban", country: "South Africa", countryCode: "ZA" },
  { city: "Pretoria", country: "South Africa", countryCode: "ZA" },
  { city: "Berlin", country: "Germany", countryCode: "DE" },
  { city: "Hamburg", country: "Germany", countryCode: "DE" },
  { city: "Munich", country: "Germany", countryCode: "DE" },
  { city: "Cologne", country: "Germany", countryCode: "DE" },
  { city: "Frankfurt", country: "Germany", countryCode: "DE" },
  { city: "Paris", country: "France", countryCode: "FR" },
  { city: "Lyon", country: "France", countryCode: "FR" },
  { city: "Marseille", country: "France", countryCode: "FR" },
  { city: "Mumbai", country: "India", countryCode: "IN" },
  { city: "Delhi", country: "India", countryCode: "IN" },
  { city: "Bangalore", country: "India", countryCode: "IN" },
  { city: "Hyderabad", country: "India", countryCode: "IN" },
  { city: "Chennai", country: "India", countryCode: "IN" },
  { city: "Kolkata", country: "India", countryCode: "IN" },
  { city: "Pune", country: "India", countryCode: "IN" },
  { city: "São Paulo", country: "Brazil", countryCode: "BR" },
  { city: "Rio de Janeiro", country: "Brazil", countryCode: "BR" },
  { city: "Brasília", country: "Brazil", countryCode: "BR" },
  { city: "Mexico City", country: "Mexico", countryCode: "MX" },
  { city: "Guadalajara", country: "Mexico", countryCode: "MX" },
  { city: "Monterrey", country: "Mexico", countryCode: "MX" },
  { city: "Madrid", country: "Spain", countryCode: "ES" },
  { city: "Barcelona", country: "Spain", countryCode: "ES" },
  { city: "Rome", country: "Italy", countryCode: "IT" },
  { city: "Milan", country: "Italy", countryCode: "IT" },
  { city: "Amsterdam", country: "Netherlands", countryCode: "NL" },
  { city: "Stockholm", country: "Sweden", countryCode: "SE" },
  { city: "Oslo", country: "Norway", countryCode: "NO" },
  { city: "Copenhagen", country: "Denmark", countryCode: "DK" },
  { city: "Helsinki", country: "Finland", countryCode: "FI" },
  { city: "Zurich", country: "Switzerland", countryCode: "CH" },
  { city: "Geneva", country: "Switzerland", countryCode: "CH" },
  { city: "Tokyo", country: "Japan", countryCode: "JP" },
  { city: "Osaka", country: "Japan", countryCode: "JP" },
  { city: "Seoul", country: "South Korea", countryCode: "KR" },
  { city: "Singapore", country: "Singapore", countryCode: "SG" },
  { city: "Dubai", country: "UAE", countryCode: "AE" },
  { city: "Abu Dhabi", country: "UAE", countryCode: "AE" },
  { city: "Riyadh", country: "Saudi Arabia", countryCode: "SA" },
  { city: "Jeddah", country: "Saudi Arabia", countryCode: "SA" },
  { city: "Cairo", country: "Egypt", countryCode: "EG" },
  { city: "Alexandria", country: "Egypt", countryCode: "EG" },
  { city: "Casablanca", country: "Morocco", countryCode: "MA" },
  { city: "Accra", country: "Ghana", countryCode: "GH" },
  { city: "Dar es Salaam", country: "Tanzania", countryCode: "TZ" },
  { city: "Kampala", country: "Uganda", countryCode: "UG" },
  { city: "Addis Ababa", country: "Ethiopia", countryCode: "ET" },
  { city: "Jakarta", country: "Indonesia", countryCode: "ID" },
  { city: "Manila", country: "Philippines", countryCode: "PH" },
  { city: "Bangkok", country: "Thailand", countryCode: "TH" },
  { city: "Ho Chi Minh City", country: "Vietnam", countryCode: "VN" },
  { city: "Kuala Lumpur", country: "Malaysia", countryCode: "MY" },
  { city: "Karachi", country: "Pakistan", countryCode: "PK" },
  { city: "Lahore", country: "Pakistan", countryCode: "PK" },
  { city: "Dhaka", country: "Bangladesh", countryCode: "BD" },
  { city: "Colombo", country: "Sri Lanka", countryCode: "LK" },
  { city: "Kathmandu", country: "Nepal", countryCode: "NP" },
  { city: "Istanbul", country: "Turkey", countryCode: "TR" },
  { city: "Ankara", country: "Turkey", countryCode: "TR" },
  { city: "Warsaw", country: "Poland", countryCode: "PL" },
  { city: "Prague", country: "Czech Republic", countryCode: "CZ" },
  { city: "Vienna", country: "Austria", countryCode: "AT" },
  { city: "Budapest", country: "Hungary", countryCode: "HU" },
  { city: "Bucharest", country: "Romania", countryCode: "RO" },
  { city: "Athens", country: "Greece", countryCode: "GR" },
  { city: "Lisbon", country: "Portugal", countryCode: "PT" },
  { city: "Brussels", country: "Belgium", countryCode: "BE" },
  { city: "Kyiv", country: "Ukraine", countryCode: "UA" },
  { city: "Moscow", country: "Russia", countryCode: "RU" },
  { city: "St. Petersburg", country: "Russia", countryCode: "RU" },
  { city: "Tel Aviv", country: "Israel", countryCode: "IL" },
  { city: "Beijing", country: "China", countryCode: "CN" },
  { city: "Shanghai", country: "China", countryCode: "CN" },
  { city: "Guangzhou", country: "China", countryCode: "CN" },
  { city: "Shenzhen", country: "China", countryCode: "CN" },
  { city: "Auckland", country: "New Zealand", countryCode: "NZ" },
  { city: "Wellington", country: "New Zealand", countryCode: "NZ" },
  { city: "Buenos Aires", country: "Argentina", countryCode: "AR" },
  { city: "Lima", country: "Peru", countryCode: "PE" },
  { city: "Bogotá", country: "Colombia", countryCode: "CO" },
  { city: "Santiago", country: "Chile", countryCode: "CL" },
]

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

    const results = Array.from(combined.values())
      .filter(c => c.city.toLowerCase().includes(q))
      .slice(0, 10)

    res.json(results)
  } catch (err) {
    res.json([])
  }
})

export default router
