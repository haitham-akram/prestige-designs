'use client'

import { useCart } from '@/contexts/CartContext'

export default function CartDebug() {
  const { state } = useCart()

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '400px',
        maxHeight: '80vh',
        overflow: 'auto',
        zIndex: 9999,
        fontFamily: 'monospace',
        fontSize: '12px',
        border: '2px solid #8261c6',
      }}
    >
      <h3 style={{ margin: '0 0 15px 0', color: '#03ecfd' }}>🛒 Cart Debug</h3>

      <div style={{ marginBottom: '10px' }}>
        <strong>Total Items:</strong> {state.totalItems}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Total Price:</strong> ${state.totalPrice.toFixed(2)}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Total Savings:</strong> ${state.totalSavings.toFixed(2)}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Items ({state.items.length}):</strong>
      </div>

      {state.items.map((item, index) => (
        <div
          key={item.id}
          style={{
            border: '1px solid #333',
            padding: '10px',
            marginBottom: '10px',
            borderRadius: '4px',
            background: 'rgba(130, 97, 198, 0.1)',
          }}
        >
          <div style={{ marginBottom: '5px' }}>
            <strong>Item {index + 1}:</strong> {item.name}
          </div>
          <div style={{ marginBottom: '5px' }}>
            <strong>Price:</strong> ${item.price} | <strong>Qty:</strong> {item.quantity}
          </div>
          <div style={{ marginBottom: '5px' }}>
            <strong>Category:</strong> {item.category || 'N/A'}
          </div>

          {item.customizations && Object.keys(item.customizations).length > 0 ? (
            <div style={{ marginTop: '8px' }}>
              <strong style={{ color: '#03ecfd' }}>🎨 Customizations:</strong>

              {item.customizations.colors && item.customizations.colors.length > 0 && (
                <div style={{ marginTop: '5px', marginLeft: '10px' }}>
                  <strong>Colors:</strong> {item.customizations.colors.map((c) => c.name).join(', ')}
                </div>
              )}

              {item.customizations.textChanges && item.customizations.textChanges.length > 0 && (
                <div style={{ marginTop: '5px', marginLeft: '10px' }}>
                  <strong>Text Changes:</strong>
                  {item.customizations.textChanges.map((tc, i) => (
                    <div key={i} style={{ marginLeft: '10px', fontSize: '11px' }}>
                      {tc.field}: {tc.value}
                    </div>
                  ))}
                </div>
              )}

              {item.customizations.uploadedImages && item.customizations.uploadedImages.length > 0 && (
                <div style={{ marginTop: '5px', marginLeft: '10px' }}>
                  <strong>Uploaded Images:</strong> {item.customizations.uploadedImages.length} images
                  {item.customizations.uploadedImages.map((img, i) => (
                    <div key={i} style={{ marginLeft: '10px', fontSize: '11px', wordBreak: 'break-all' }}>
                      Image {i + 1}: {img.url.substring(0, 50)}...
                    </div>
                  ))}
                </div>
              )}

              {item.customizations.uploadedLogo && (
                <div style={{ marginTop: '5px', marginLeft: '10px' }}>
                  <strong>Uploaded Logo:</strong>
                  <div style={{ marginLeft: '10px', fontSize: '11px', wordBreak: 'break-all' }}>
                    {item.customizations.uploadedLogo.url.substring(0, 50)}...
                  </div>
                </div>
              )}

              {item.customizations.customizationNotes && (
                <div style={{ marginTop: '5px', marginLeft: '10px' }}>
                  <strong>Notes:</strong>
                  <div style={{ marginLeft: '10px', fontSize: '11px' }}>{item.customizations.customizationNotes}</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: '5px', color: '#666' }}>No customizations</div>
          )}
        </div>
      ))}

      {state.items.length === 0 && <div style={{ color: '#666', fontStyle: 'italic' }}>Cart is empty</div>}
    </div>
  )
}
