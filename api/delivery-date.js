export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { pincode } = req.query;
  if (!pincode || !/^[0-9]{6}$/.test(pincode)) {
    return res.status(400).json({ ok: false, message: "Invalid pincode" });
  }

  try {
    const token = process.env.DELHIVERY_API_KEY;
    const pickup = process.env.PICKUP_PINCODE;

    // 1️⃣ Check serviceability
    const serviceUrl =
      `https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}&token=${token}`;

    const serviceRes = await fetch(serviceUrl);
    const service = await serviceRes.json();

    if (!service?.delivery_codes?.length) {
      return res.json({ ok: false, message: "Delivery not available to this pincode" });
    }

    // 2️⃣ Get real-time SLA / TAT from Delhivery
    const slaUrl =
      `https://track.delhivery.com/api/cmu/pincode-stats/?origin=${pickup}&destination=${pincode}&token=${token}`;

    const slaRes = await fetch(slaUrl);
    const sla = await slaRes.json();

    if (!sla?.data?.tat) {
      return res.json({ ok: false, message: "Unable to fetch delivery ETA" });
    }

    const tat = Number(sla.data.tat);

    // 3️⃣ Dispatch logic (6 PM IST cut-off)
    const nowIST = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
    );

    let dispatch = new Date(nowIST);
    if (nowIST.getHours() >= 18) {
      dispatch.setDate(dispatch.getDate() + 1);
    }
    dispatch.setHours(0, 0, 0, 0);

    // 4️⃣ Final delivery date
    const edd = new Date(dispatch);
    edd.setDate(edd.getDate() + tat);

    const format = d => d.toISOString().split("T")[0];

    return res.json({
      ok: true,
      pincode,
      dispatchDate: format(dispatch),
      estimatedDeliveryDate: format(edd),
      source: "delhivery-dynamic"
    });

  } catch (err) {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}



