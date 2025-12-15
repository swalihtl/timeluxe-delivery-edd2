export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { pincode } = req.query;
  if (!pincode) {
    return res.status(400).json({ ok: false, message: "Pincode required" });
  }

  try {
    const token = process.env.DELHIVERY_API_KEY;
    const origin = process.env.PICKUP_PINCODE;

    const url =
      `https://track.delhivery.com/api/dc/expected_tat` +
      `?origin_pin=${origin}` +
      `&destination_pin=${pincode}` +
      `&mot=S`;

    const r = await fetch(url, {
      headers: {
        "Authorization": `Token ${token}`,
        "Accept": "application/json"
      }
    });

    const data = await r.json();

    if (!data || !data.expected_tat) {
      return res.json({ ok: false, message: "Delivery not available" });
    }

    const tat = Number(data.expected_tat);

    // Dispatch logic
    const now = new Date();
    let dispatchDate = new Date(now);
    if (now.getHours() >= 18) {
      dispatchDate.setDate(dispatchDate.getDate() + 1);
    }

    const fromDate = new Date(dispatchDate);
    fromDate.setDate(fromDate.getDate() + tat - 1);

    const toDate = new Date(dispatchDate);
    toDate.setDate(toDate.getDate() + tat);

    const format = d =>
      d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

    return res.json({
      ok: true,
      pincode,
      tat,
      delivery_range: `${format(fromDate)} - ${format(toDate)}`
    });

  } catch (e) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
