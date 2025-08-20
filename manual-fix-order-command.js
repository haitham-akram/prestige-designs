// Open the admin panel for order PD-2025-058
// Go to: http://localhost:3000/admin/orders/68a5a5eb0614d0583f7c8f2e
// Or find it in the orders list and click on it

// Then in the browser console, run this:
fetch('/api/orders/update-status', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    orderId: '68a5a5eb0614d0583f7c8f2e',
    status: 'processing',
    deliveryType: 'custom_work',
    note: 'تم تحديث الطلب إلى processing مع deliveryType custom_work - تصحيح يدوي',
  }),
})
  .then((response) => response.json())
  .then((data) => console.log('Order updated:', data))
  .catch((error) => console.error('Error:', error))
