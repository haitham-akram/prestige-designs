'use client'

import ProductCard from './ProductCard'

interface ProductGridProps {
  category?: string
  limit?: number
}

export default function ProductGrid({ category, limit = 4 }: ProductGridProps) {
  // Placeholder products - will be replaced with real data from API
  const products = [
    {
      id: '1',
      name: 'اليرت One Lift Sub',
      price: 99,
      originalPrice: 149,
      rating: 4.5,
      image: '/placeholder-product.jpg',
      category: 'premium',
    },
    {
      id: '2',
      name: 'اليرت Smoke',
      price: 79,
      originalPrice: 119,
      rating: 4.8,
      image: '/placeholder-product.jpg',
      category: 'premium',
    },
    {
      id: '3',
      name: 'اليرت Fire',
      price: 89,
      originalPrice: 129,
      rating: 4.6,
      image: '/placeholder-product.jpg',
      category: 'premium',
    },
    {
      id: '4',
      name: 'اليرت Ice',
      price: 69,
      originalPrice: 99,
      rating: 4.7,
      image: '/placeholder-product.jpg',
      category: 'premium',
    },
  ]

  const filteredProducts = category
    ? products.filter((p) => p.category === category).slice(0, limit)
    : products.slice(0, limit)

  return (
    <div className="products-grid">
      {filteredProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
