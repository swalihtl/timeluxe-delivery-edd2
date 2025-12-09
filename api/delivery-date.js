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

    const url = `https://track.delhivery.com/api/cmu/pincode-stats/?token=${apiKey}&origin=${pickup}&destination=${pincode}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data?.data || !data?.data?.eta) {
      return res.status(200).json({
        ok: false,
        message: "Delivery not available"
      });
    }

    const etaDays = Number(data.data.eta); // transit days from Delhivery
    const today = new Date();
    const estimated = new Date(today);
    estimated.setDate(today.getDate() + etaDays);

    const formatted = estimated.toISOString().split("T")[0];

    return res.status(200).json({
      ok: true,
      pincode,
      tat: etaDays,
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
