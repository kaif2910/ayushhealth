import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      appName: 'AYUSH Patient Case-Taking',
      demoOnly: 'SIH26047 · Fictional demo data only',
      intake: 'Patient Intake',
      dashboard: 'Doctor Dashboard',
      startIntake: 'Start patient intake',
      demographics: 'Demographics',
      complaint: 'Chief complaint',
      assessment: 'AYUSH assessment',
      history: 'History & lifestyle',
      documents: 'Documents',
      review: 'Review & submit',
      next: 'Save & continue',
      back: 'Back',
      submit: 'Submit case sheet',
      name: 'Full name',
      age: 'Age',
      gender: 'Gender',
      contact: 'Contact number',
      preferredLanguage: 'Preferred language',
      abha: 'ABHA ID (optional, mocked)',
      verify: 'Verify',
      aiDisclaimer: 'AI-assisted fields are decision-support only and must be verified by a practitioner. They are never a diagnosis.',
    },
  },
  hi: {
    translation: {
      appName: 'आयुष रोगी केस-टेकिंग',
      demoOnly: 'SIH26047 · केवल काल्पनिक डेमो डेटा',
      intake: 'रोगी जानकारी',
      dashboard: 'डॉक्टर डैशबोर्ड',
      startIntake: 'रोगी जानकारी शुरू करें',
      demographics: 'मूल जानकारी',
      complaint: 'मुख्य शिकायत',
      assessment: 'आयुष आकलन',
      history: 'इतिहास और जीवनशैली',
      documents: 'दस्तावेज़',
      review: 'समीक्षा और जमा करें',
      next: 'सहेजें और आगे बढ़ें',
      back: 'पीछे',
      submit: 'केस शीट जमा करें',
      name: 'पूरा नाम',
      age: 'आयु',
      gender: 'लिंग',
      contact: 'संपर्क नंबर',
      preferredLanguage: 'पसंदीदा भाषा',
      abha: 'ABHA ID (वैकल्पिक, मॉक)',
      verify: 'सत्यापित करें',
      aiDisclaimer: 'AI-सहायता केवल निर्णय-समर्थन के लिए है। डॉक्टर द्वारा सत्यापन आवश्यक है; यह निदान नहीं है।',
    },
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
