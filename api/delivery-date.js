export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { pincode } = req.query;
  if (!pincode) return res.status(400).json({ ok: false, error: "Missing pincode" });

  try {
    const apiKey = process.env.DELHIVERY_API_KEY;
    const pickup = process.env.PICKUP_PINCODE;

    // Step 1: Check serviceability
    const serviceUrl = `https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}&token=${apiKey}`;
    const serviceRes = await fetch(serviceUrl);
    const service = await serviceRes.json();

    const codes = service.delivery_codes?.[0]?.postal_code;
    if (!codes) {
      return res.status(200).json({
        ok: false,
        message: "Delivery not available"
      });
    }

    // Step 2: SLA lookup (transit days)
    const slaUrl = `https://track.delhivery.com/api/kinko/v1/invoice/charges/.json?token=${apiKey}&md=1&ss=1&o_pin=${pickup}&d_pin=${pincode}&cgm=1`;
    const slaRes = await fetch(slaUrl);
    const sla = await slaRes.json();

    const tat = sla?.delivery_details?.[0]?.etd || 4; // fallback 4 days

    const today = new Date();
    today.setDate(today.getDate() + Number(tat));
    const formatted = today.toISOString().split("T")[0];

    return res.status(200).json({
      ok: true,
      pincode,
      tat: Number(tat),
      estimatedDate: formatted,
      message: `Estimated delivery by ${formatted}`
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
}
