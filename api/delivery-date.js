export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { pincode } = req.query;
  if (!pincode) {
    return res.status(400).json({ ok: false, error: "Missing pincode" });
  }

  // India-only simple check
  if (!/^[0-9]{6}$/.test(pincode)) {
    return res.status(200).json({
      ok: false,
      message: "We currently ship only within India to valid 6-digit pincodes."
    });
  }

  try {
    const apiKey = process.env.DELHIVERY_API_KEY;
    const pickup = process.env.PICKUP_PINCODE;

    // 1) Check serviceability
    const serviceUrl = `https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}&token=${apiKey}`;
    const serviceRes = await fetch(serviceUrl);
    const service = await serviceRes.json();

    const codes = service.delivery_codes?.[0]?.postal_code;
    if (!codes) {
      return res.status(200).json({
        ok: false,
        message: "Delivery not available to this pincode."
      });
    }

    // 2) Get transit days (tat) from SLA API
    const slaUrl = `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?token=${apiKey}&md=1&ss=1&o_pin=${pickup}&d_pin=${pincode}&cgm=1`;
    const slaRes = await fetch(slaUrl);
    const sla = await slaRes.json();

    // Try multiple possible fields; fallback 4
    const tatRaw =
      sla?.delivery_details?.[0]?.etd ||
      sla?.delivery_details?.[0]?.estimated_delivery_days ||
      4;
    const tat = Number(tatRaw) || 4;

    // 3) Dispatch date with 7 PM IST cutoff
    const now = new Date();
    const istNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    const hour = istNow.getHours();

    let dispatchDate = new Date(istNow);
    if (hour >= 19) {
      // after 7 PM → dispatch next day
      dispatchDate.setDate(dispatchDate.getDate() + 1);
    }
    dispatchDate.setHours(0, 0, 0, 0);

    // 4) Base ETA date = dispatch + tat
    const baseEta = new Date(dispatchDate);
    baseEta.setDate(baseEta.getDate() + tat);

    // 5) Display range = baseEta + 1 to baseEta + 2
    const rangeStart = new Date(baseEta);
    rangeStart.setDate(rangeStart.getDate() + 1);

    const rangeEnd = new Date(baseEta);
    rangeEnd.setDate(rangeEnd.getDate() + 2);

    const fmt = (d) => d.toISOString().split("T")[0]; // YYYY-MM-DD

    return res.status(200).json({
      ok: true,
      pincode,
      tat,
      dispatchDate: fmt(dispatchDate),
      baseEtaDate: fmt(baseEta),
      rangeStartDate: fmt(rangeStart),
      rangeEndDate: fmt(rangeEnd),
      message: `Estimated delivery between ${fmt(rangeStart)} and ${fmt(rangeEnd)}`
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error"
    });
  }
}
