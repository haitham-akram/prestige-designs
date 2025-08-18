const fetch = require('node-fetch')

async function testCustomerOrders() {
  try {
    const response = await fetch('http://localhost:3000/api/orders/customer', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log('Response Status:', response.status)
    console.log('Response Headers:', response.headers.get('content-type'))

    const data = await response.json()
    console.log('Response Body:')
    console.log(JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error testing customer orders:', error)
  }
}

testCustomerOrders()
