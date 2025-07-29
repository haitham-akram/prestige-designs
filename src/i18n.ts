import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

i18n
    .use(HttpBackend)
    .use(initReactI18next)
    .init({
        fallbackLng: 'ar',
        supportedLngs: ['en', 'ar'],
        lng: 'ar',
        backend: {
            loadPath: '/locales/{{lng}}/translation.json',
        },
        react: { useSuspense: false },
        interpolation: { escapeValue: false },
    });

export default i18n; 