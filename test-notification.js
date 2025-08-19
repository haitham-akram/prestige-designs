// Test API endpoint for admin notifications
fetch('http://localhost:3000/api/admin/notify-new-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer system-internal-call',
  },
  body: JSON.stringify({
    orderId: 'test-id-123',
    orderNumber: 'TEST-001',
    isFreeOrder: true,
    hasCustomizations: false,
  }),
})
  .then((response) => response.json())
  .then((data) => {
    console.log('✅ Success:', data)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
  })
