const fetch = require('node-fetch')

async function testPromoCode() {
  try {
    const response = await fetch('http://localhost:3000/api/promo-codes/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'SAVE30',
        orderValue: 4,
      }),
    })

    console.log('Response Status:', response.status)
    console.log('Response Headers:', response.headers)

    const data = await response.json()
    console.log('Response Body:')
    console.log(JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error testing promo code:', error)
  }
}

testPromoCode()
