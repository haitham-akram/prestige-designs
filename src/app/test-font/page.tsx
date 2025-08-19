import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'اختبار الخط العربي - Prestige Designs',
  description: 'صفحة اختبار للخط العربي الجديد',
}

export default function FontTestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="arabic-title text-white mb-4">بريستيج ديزاينز</h1>
          <p className="arabic-subtitle text-purple-200 mb-2">اختبار الخط العربي الجديد</p>
          <p className="arabic-body text-purple-300">خط AraHamah Al Fidaa - Regular</p>
        </div>

        {/* Content Cards */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Arabic Text Samples */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="arabic-heading text-white text-2xl mb-4">🎨 نماذج النصوص العربية</h2>

            <div className="space-y-4 text-white">
              <div className="arabic-title text-xl">العنوان الرئيسي - Arabic Title</div>

              <div className="arabic-subtitle text-lg text-purple-200">العنوان الفرعي - Arabic Subtitle</div>

              <div className="arabic-body text-purple-100">
                هذا نص تجريبي باللغة العربية لاختبار جودة الخط الجديد. يجب أن يظهر النص بوضوح وجمالية عالية.
              </div>

              <div className="arabic-body text-sm text-purple-200">
                نص صغير - Small Text: يستخدم في التفاصيل والملاحظات الفرعية في الموقع.
              </div>
            </div>
          </div>

          {/* UI Elements Test */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="arabic-heading text-white text-2xl mb-4">🔧 عناصر واجهة المستخدم</h2>

            <div className="space-y-4">
              {/* Buttons */}
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white arabic-body py-3 px-6 rounded-lg transition-colors">
                زر باللغة العربية
              </button>

              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white arabic-body py-2 px-4 rounded transition-colors">
                تسجيل الدخول
              </button>

              {/* Form Elements */}
              <input
                type="text"
                placeholder="أدخل اسمك هنا..."
                className="w-full bg-white/20 border border-white/30 text-white arabic-body placeholder-purple-200 py-2 px-4 rounded"
              />

              <textarea
                placeholder="اكتب رسالتك باللغة العربية..."
                className="w-full bg-white/20 border border-white/30 text-white arabic-body placeholder-purple-200 py-2 px-4 rounded h-20 resize-none"
              />

              {/* Labels */}
              <label className="block text-white arabic-body text-sm">البريد الإلكتروني:</label>
            </div>
          </div>

          {/* Numbers and Mixed Content */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="arabic-heading text-white text-2xl mb-4">🔢 الأرقام والمحتوى المختلط</h2>

            <div className="space-y-3 text-white">
              <div className="arabic-body">التاريخ: ١٩ أغسطس ٢٠٢٥</div>

              <div className="arabic-body">السعر: ٢٥.٩٩ دولار</div>

              <div className="arabic-body">الهاتف: +٩٦٦ ٥٠ ١٢٣ ٤٥٦٧</div>

              <div className="arabic-body">Mixed: Design Package رقم ١ - $49.99</div>

              <div className="arabic-body text-sm">العنوان: شارع الملك فهد، الرياض ١٢٣٤٥، المملكة العربية السعودية</div>
            </div>
          </div>

          {/* Typography Scale */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="arabic-heading text-white text-2xl mb-4">📏 مقاييس الخطوط</h2>

            <div className="space-y-3">
              <div className="text-4xl arabic-font text-white">حجم كبير جداً - 4XL</div>
              <div className="text-3xl arabic-font text-white">حجم كبير - 3XL</div>
              <div className="text-2xl arabic-font text-white">حجم متوسط كبير - 2XL</div>
              <div className="text-xl arabic-font text-white">حجم متوسط - XL</div>
              <div className="text-lg arabic-font text-white">حجم عادي كبير - LG</div>
              <div className="text-base arabic-font text-white">حجم عادي - Base</div>
              <div className="text-sm arabic-font text-purple-200">حجم صغير - SM</div>
              <div className="text-xs arabic-font text-purple-300">حجم صغير جداً - XS</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 p-6 bg-white/5 rounded-xl border border-white/10">
          <p className="arabic-body text-purple-200 mb-2">تم تطبيق الخط العربي بنجاح! ✅</p>
          <p className="text-sm text-purple-300 arabic-body">
            يمكنك الآن استخدام الخط في جميع أنحاء الموقع باستخدام الكلاسات المخصصة
          </p>
        </div>
      </div>
    </div>
  )
}
