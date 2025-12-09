// api/delivery-date.js

module.exports = (req, res) => {
  const { pincode, productId } = req.query;

  // Fake delivery = 5 days from now
  const today = new Date();
  const estimated = new Date(today);
  estimated.setDate(today.getDate() + 5);

  const year = estimated.getFullYear();
  const month = String(estimated.getMonth() + 1).padStart(2, "0");
  const day = String(estimated.getDate()).padStart(2, "0");
  const formatted = `${year}-${month}-${day}`;

  res.status(200).json({
    ok: true,
    pincode: pincode || null,
    productId: productId || null,
    estimatedDate: formatted,
    message: `Estimated delivery by ${formatted}`,
  });
};
