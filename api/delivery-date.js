// api/delivery-date.js

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { pincode } = req.query;

  // Basic validation
  if (!pincode || !/^[0-9]{6}$/.test(pincode)) {
    return res.status(400).json({
      ok: false,
      error: "Invalid pincode",
      message: "We currently ship only within India to valid 6-digit pincodes."
    });
  }

  // ---- Timeluxe custom TAT logic ----
  function getTat(pin) {
    const first2 = pin.slice(0, 2);
    const first3 = pin.slice(0, 3);

    // Kerala — 2 days for Kannur, Kozhikode, Malappuram, Kasargode
    const kerala2DayPrefixes = [
      "670", // Kannur
      "671", // Kannur / Kasargode
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
      "11",                         // Delhi
      "40","41","42","43","44",    // Mumbai / Maharashtra
      "70","71","72",              // Kolkata region
      "50","51","52","53"          // Hyderabad / AP / TS metros
    ];
    if (metroPrefixes.includes(first2)) return 4;

    // Rest of India — 5 days
    return 5;
  }

  try {
    const apiKey = process.env.DELHIVERY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "Missing DELHIVERY_API_KEY environment variable"
      });
    }

    // 1) Check serviceability using Delhivery
    const serviceUrl =
      `https://track.delhivery.com/c/api/pin-codes/json/` +
      `?filter_codes=${encodeURIComponent(pincode)}` +
      `&token=${encodeURIComponent(apiKey)}`;

    const serviceRes = await fetch(serviceUrl);
    if (!serviceRes.ok) {
      return res.status(500).json({
        ok: false,
        error: "Error from Delhivery serviceability API",
        status: serviceRes.status
      });
    }

    const service = await serviceRes.json();
    const codes = service?.delivery_codes?.[0]?.postal_code;

    if (!codes) {
      return res.status(200).json({
        ok: false,
        message: "Delivery not available to this pincode."
      });
    }

    // 2) Decide TAT using your custom rules
    const tat = getTat(pincode);

    // 3) Dispatch date with 7 PM IST cut-off
    const now = new Date();
    const istNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    let dispatch = new Date(istNow);
    if (istNow.getHours() >= 19) {
      // after 7 PM → dispatch next day
      dispatch.setDate(dispatch.getDate() + 1);
    }
    dispatch.setHours(0, 0, 0, 0);

    // 4) Build ETA window
    const etaBase = new Date(dispatch);
    etaBase.setDate(etaBase.getDate() + tat);

    const rangeStart = new Date(etaBase);
    rangeStart.setDate(rangeStart.getDate() + 1);

    const rangeEnd = new Date(etaBase);
    rangeEnd.setDate(rangeEnd.getDate() + 2);

    const fmt = (d) => d.toISOString().split("T")[0];

    return res.status(200).json({
      ok: true,
      pincode,
      tat,
      dispatchDate: fmt(dispatch),
      rangeStartDate: fmt(rangeStart),
      rangeEndDate: fmt(rangeEnd),
      message: `Delivery between ${fmt(rangeStart)} and ${fmt(rangeEnd)}`
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "Server error"
    });
  }
}
