'use client'

// import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import CustomerLayout from './customer-layout'
import AnimatedSection from '@/components/AnimatedSection'
import HeroSection from '@/components/customer/HeroSection'
// import PackagesSection from '@/components/customer/PackagesSection'
// import StoreStats from '@/components/customer/StoreStats'
import CategoriesWithProducts from '@/components/customer/CategoriesWithProducts'
// import CustomDesignSection from '@/components/customer/CustomDesignSection'
// import FeaturesSection from '@/components/customer/FeaturesSection'
import DiscordSection from '@/components/customer/DiscordSection'
import SocialSection from '@/components/customer/SocialSection'
import ReviewsSection from '@/components/customer/ReviewsSection'
import FAQSection from '@/components/customer/FAQSection'
import FeaturedClientsSection from '@/components/customer/FeaturedClientsSection'

export default function HomePage() {
  // const { data: session } = useSession()
  const searchParams = useSearchParams()
  const isDeactivated = searchParams.get('deactivated') === 'true'

  return (
    <CustomerLayout>
      {/* Deactivation Banner */}
      {isDeactivated && (
        <div className="deactivation-banner">
          <div className="container">
            <div className="banner-content">
              <div className="banner-icon">⚠️</div>
              <div className="banner-text">
                <h3>تم إلغاء تفعيل حسابك</h3>
                <p>تم إلغاء تفعيل حسابك من قبل المدير. يرجى التواصل مع الدعم الفني للمساعدة.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <AnimatedSection animation="fade-up" delay={0}>
        <HeroSection />
      </AnimatedSection>

      {/* Packages Section */}
      {/* <PackagesSection /> */}

      {/* Categories with Products */}
      <CategoriesWithProducts />

      {/* Custom Design Section */}
      {/* <CustomDesignSection /> */}

      {/* Features Section */}
      {/* <FeaturesSection /> */}

      {/* Discord Section */}
      <AnimatedSection animation="fade-left" delay={200}>
        <DiscordSection />
      </AnimatedSection>

      {/* Social Section */}
      <AnimatedSection animation="fade-up" delay={250}>
        <SocialSection />
      </AnimatedSection>

      {/* Featured Clients */}
      <AnimatedSection animation="fade-right" delay={350}>
        <FeaturedClientsSection />
      </AnimatedSection>

      {/* Reviews Section */}
      <AnimatedSection animation="scale-up" delay={450}>
        <ReviewsSection />
      </AnimatedSection>

      {/* FAQ Section */}
      <AnimatedSection animation="fade-up" delay={550}>
        <FAQSection />
      </AnimatedSection>
    </CustomerLayout>
  )
}
