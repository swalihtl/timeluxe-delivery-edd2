function getTat(pin) {
  const first2 = pin.slice(0, 2);
  const first3 = pin.slice(0, 3);

  // Kerala — 2 days for Kannur, Kozhikode, Malappuram, Kasargod districts
  const kerala2DayPrefixes = [
    "670", // Kannur
    "671", // Kannur / Kasargod
    "673", // Kozhikode
    "676", // Malappuram
    "679"  // Malappuram
  ];
  if (kerala2DayPrefixes.includes(first3)) return 2;

  // Rest of Kerala — 3 days
  if (first2 === "67") return 3;

  // Bangalore — 3 days
  const bangalore = ["560", "561", "562"];
  if (bangalore.includes(first3)) return 3;

  // Tamil Nadu & rest of Karnataka — 3 days
  const tnPrefixes = ["60", "61", "62", "63", "64"];
  const kaPrefixes = ["56", "57", "58", "59"];
  if (tnPrefixes.includes(first2) || kaPrefixes.includes(first2)) return 3;

  // Metro cities (except BLR) — 4 days
  const metroPrefixes = [
    "11", // Delhi
    "40","41","42","43","44", // Mumbai / Maharashtra
    "70","71","72",           // Kolkata region
    "50","51","52","53"       // Hyderbad / AP / TS metros
  ];
  if (metroPrefixes.includes(first2)) return 4;

  // Rest of India — 5 days
  return 5;
}
