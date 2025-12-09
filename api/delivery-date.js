export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { pincode } = req.query;
  if (!pincode) {
    return res.status(400).json({ ok: false, error: "Missing pincode" });
  }

  // Basic India-only guard (6-digit pincode)
  if (!/^[0-9]{6}$/.test(pincode)) {
    return res.status(200).json({
      ok: false,
      message: "We currently ship only within India to valid 6-digit pincodes."
    });
  }

  try {
    const apiKey = process.env.DELHIVERY_API_KEY;
    const pickup = process.env.PICKUP_PINCODE;

    // STEP 1: Check serviceability
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

    // STEP 2: SLA / transit time
    const slaUrl = `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?token=${apiKey}&md=1&ss=1&o_pin=${pickup}&d_pin=${pincode}&cgm=1`;
    const slaRes = await fetch(slaUrl);
    const sla = await slaRes.json();

    // Delhivery may return ETD / transit days in different fields – we use a fallback
    const tatRaw =
      sla?.delivery_details?.[0]?.etd ||
      sla?.delivery_details?.[0]?.estimated_delivery_days ||
      4;
    const tat = Number(tatRaw) || 4;

    // STEP 3: Calculate dispatch date with 7 PM cutoff (IST)
    const now = new Date();
    const istNow = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );
    const hour = istNow.getHours();

    let dispatchDate = new Date(istNow);
    if (hour >= 19) {
      // after 7 PM IST → dispatch next day
      dispatchDate.setDate(dispatchDate.getDate() + 1);
    }
    // normalise time to midnight for clean date
    dispatchDate.setHours(0, 0, 0, 0);

    // STEP 4: EDD = dispatchDate + tat days
    const etaDate = new Date(dispatchDate);
    etaDate.setDate(etaDate.getDate() + tat);

    const dispatchStr = dispatchDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const etaStr = etaDate.toISOString().split("T")[0];

    return res.status(200).json({
      ok: true,
      pincode,
      tat,
      dispatchDate: dispatchStr,
      estimatedDate: etaStr,
      message: `Estimated delivery by ${etaStr}`,
      note: "Orders placed before 7 PM IST are dispatched same day. Orders after 7 PM dispatch next working day."
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "Server error"
    });
  }
}
