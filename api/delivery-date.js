export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { pincode } = req.query;
  if (!pincode || !/^[0-9]{6}$/.test(pincode)) {
    return res.status(400).json({ ok: false, error: "Invalid pincode" });
  }

  // Delivery region logic for Timeluxe
  function getTat(pin) {
    const first2 = pin.slice(0, 2);
    const first3 = pin.slice(0, 3);

    // North Kerala (Malappuram, Kannur, Kasargode)
    const northKerala = ["676", "679", "670", "671"];
    if (northKerala.includes(first3)) return 2;

    // Rest of Kerala (same first 2 digits 67 but not above)
    if (first2 === "67") return 3;

    // Bangalore
    const bangalore = ["560", "561", "562"];
    if (bangalore.includes(first3)) return 3;

    // Tamil Nadu & rest of Karnataka
    const tnPrefixes = ["60","61","62","63","64"];
    const kaPrefixes = ["56","57","58","59"];
    if (tnPrefixes.includes(first2) || kaPrefixes.includes(first2)) return 3;

    // Metro cities except Bangalore (Delhi, Mumbai, Pune, Kolkata, Hyderabad)
    const metroPrefixes = [
      "11","40","41","42","43","44","70","71","72","50","51","52","53"
    ];
    if (metroPrefixes.includes(first2)) return 4;

    // Rest of India
    return 5;
  }

  try {
    const apiKey = process.env.DELHIVERY_API_KEY;

    // Check serviceability only
    const serviceUrl = `https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}&token=${apiKey}`;
    const serviceRes = await fetch(serviceUrl);
    const service = await serviceRes.json();
    if (!service?.delivery_codes?.length) {
      return res.status(200).json({ ok: false, message: "Delivery not available to this pincode." });
    }

    // Determine TAT based on your custom region rules
    const tat = getTat(pincode);

    // Get dispatch date with 7 PM cutoff
    const now = new Date();
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    let dispatch = new Date(ist);
    if (ist.getHours() >= 19) dispatch.setDate(dispatch.getDate() + 1);
    dispatch.setHours(0, 0, 0, 0);

    // ETA window
    const etaBase = new Date(dispatch);
    etaBase.setDate(etaBase.getDate() + tat);

    const rangeStart = new Date(etaBase);
    rangeStart.setDate(rangeStart.getDate() + 1);

    const rangeEnd = new Date(etaBase);
    rangeEnd.setDate(rangeEnd.getDate() + 2);

    const fmt = d => d.toISOString().split("T")[0];

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
    return res.status(500).json({ ok: false, error: err.message });
  }
}
