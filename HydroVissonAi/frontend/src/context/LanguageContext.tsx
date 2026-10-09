import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'EN' | 'HI';
export type FontSize = 'normal' | 'large' | 'xlarge';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  // System Branding & Headers
  portal_title: {
    EN: 'GOVERNMENT WATER RESOURCES & HYDROELECTRIC INFRASTRUCTURE MONITORING PORTAL',
    HI: 'सरकारी जल संसाधन एवं जलविद्युत अवसंरचना निगरानी पोर्टल',
  },
  system_name: {
    EN: 'HYDROVISION AI',
    HI: 'हाइड्रोविज़न एआई',
  },
  sub_title: {
    EN: 'AI-Assisted Dam Inspection & Predictive Maintenance Decision Support System',
    HI: 'एआई-सहायता प्राप्त बाँध निरीक्षण एवं पूर्वानुमानित रखरखाव निर्णय सहायता प्रणाली',
  },
  dept_name: {
    EN: 'Central Dam Safety Organisation — Ministry of Jal Shakti',
    HI: 'केंद्रीय बाँध सुरक्षा संगठन — जल शक्ति मंत्रालय',
  },
  secure_access: {
    EN: 'SECURE SYSTEM ACCESS',
    HI: 'सुरक्षित प्रणाली पहुँच',
  },
  system_online: {
    EN: 'SYSTEM ONLINE',
    HI: 'प्रणाली सक्रिय',
  },
  sign_out: {
    EN: 'Sign Out',
    HI: 'साइन आउट',
  },
  authorized_login: {
    EN: 'Authorized Login',
    HI: 'अधिकृत लॉगिन',
  },
  ticker_text: {
    EN: '🔴 HIGH ALERT: Bhakra Dam Spillway Discharge increased to 45,000 cusecs | 🟢 NORMAL: Tehri Dam Reservoir Level stable at 820.5m | 🟡 ADVISORY: Pre-monsoon safety inspection required for Hirakud Dam.',
    HI: '🔴 उच्च चेतावनी: भाखड़ा बाँध स्पिलवे डिस्चार्ज बढ़ाकर 45,000 क्यूसेक किया गया | 🟢 सामान्य: टिहरी बाँध जलाशय स्तर 820.5 मीटर पर स्थिर | 🟡 परामर्श: हीराकुड बाँध के लिए मानसून पूर्व सुरक्षा निरीक्षण आवश्यक।',
  },

  // Role Labels
  role_supreme: {
    EN: 'SUPREME COMMAND HQ — NDSA DIRECTORY',
    HI: 'सुप्रीम कमांड मुख्यालय — एनडीएसए शीर्ष निदेशालय',
  },
  role_authority: {
    EN: 'PORTAL 1 — GOVERNMENT AUTHORITY',
    HI: 'पोर्टल 1 — सरकारी प्राधिकरण (अथॉरिटी)',
  },
  role_operator: {
    EN: 'PORTAL 2 — DAM OPERATOR',
    HI: 'पोर्टल 2 — बाँध ऑपरेटर',
  },
  role_engineer: {
    EN: 'PORTAL 3 — INSPECTION ENGINEER',
    HI: 'पोर्टल 3 — निरीक्षण इंजीनियर',
  },
  role_manager: {
    EN: 'PORTAL 4 — MAINTENANCE MANAGER',
    HI: 'पोर्टल 4 — रखरखाव प्रबंधक',
  },
  role_authorized: {
    EN: 'AUTHORIZED PERSONNEL',
    HI: 'अधिकृत कर्मी',
  },

  // Navigation translation keys
  nav_dashboard: { EN: 'Dashboard', HI: 'डैशबोर्ड' },
  nav_dams: { EN: 'Dam Directory', HI: 'बाँध निर्देशिका' },
  nav_inspections: { EN: 'Inspections', HI: 'निरीक्षण सूची' },
  nav_drone_data: { EN: 'Drone Data', HI: 'ड्रोन डेटा' },
  nav_ai: { EN: 'AI Analysis', HI: 'एआई विश्लेषण' },
  nav_defects: { EN: 'Defects Verification', HI: 'दोष सत्यापन' },
  nav_telemetry: { EN: 'IoT Telemetry', HI: 'आईओटी टेलीमेट्री' },
  nav_eap: { EN: 'Monsoon & EAP', HI: 'मानसून व ईएपी' },
  nav_drone_planner: { EN: 'Flight Planner', HI: 'ड्रोन मिशन योजना' },
  nav_ndsa: { EN: 'NDSA Compliance', HI: 'एनडीएसए अनुपालन' },
  nav_digital_twin: { EN: '3D Digital Twin', HI: '3डी डिजिटल ट्विन' },
  nav_spatial_input: { EN: 'Spatial Fly-To Hub', HI: 'स्थानिक फ्लाई-टू हब' },
  nav_gis: { EN: 'GIS Map', HI: 'जीआईएस मानचित्र' },
  nav_risk: { EN: 'Risk Overview', HI: 'जोखिम अवलोकन' },
  nav_reports: { EN: 'Reports', HI: 'रिपोर्ट्स' },
  nav_alerts: { EN: 'Alerts Feed', HI: 'चेतावनी फ़ीड' },
  nav_audit: { EN: 'Audit Trail', HI: 'लेखापरीक्षा रिकॉर्ड' },
  nav_historical: { EN: 'Historical Comparison', HI: 'ऐतिहासिक तुलना' },
  nav_condition: { EN: 'Condition Assessment', HI: 'स्थिति मूल्यांकन' },
  nav_maintenance: { EN: 'Maintenance Orders', HI: 'रखरखाव कार्य आदेश' },
  nav_reinspection: { EN: 'Re-inspection', HI: 'पुनः निरीक्षण' },
  nav_about: { EN: 'About System', HI: 'प्रणाली परिचय' },

  // Common UI Actions & Labels
  search: { EN: 'Search', HI: 'खोजें' },
  filter: { EN: 'Filter', HI: 'फ़िल्टर' },
  export_pdf: { EN: 'Export PDF Report', HI: 'पीडीएफ रिपोर्ट निर्यात करें' },
  status: { EN: 'Status', HI: 'स्थिति' },
  actions: { EN: 'Actions', HI: 'कार्रवाई' },
  location: { EN: 'Location', HI: 'स्थान' },
  dam_name: { EN: 'Dam Name', HI: 'बाँध का नाम' },
  state: { EN: 'State', HI: 'राज्य' },
  river_basin: { EN: 'River Basin', HI: 'नदी बेसिन' },
  health_score: { EN: 'Health Score', HI: 'स्वास्थ्य स्कोर' },
  risk_level: { EN: 'Risk Level', HI: 'जोखिम स्तर' },
  view_details: { EN: 'View Details', HI: 'विवरण देखें' },
  download: { EN: 'Download', HI: 'डाउनलोड करें' },
  upload: { EN: 'Upload', HI: 'अपलोड करें' },
  submit: { EN: 'Submit', HI: 'जमा करें' },
  cancel: { EN: 'Cancel', HI: 'रद्द करें' },
  save: { EN: 'Save Changes', HI: 'परिवर्तन सहेजें' },

  // Metrics & Summaries
  total_dams: { EN: 'Total Dams Monitored', HI: 'कुल निगरानीधीन बाँध' },
  critical_vulnerabilities: { EN: 'Critical Vulnerabilities', HI: 'गंभीर खामियां' },
  pending_inspections: { EN: 'Pending Inspections', HI: 'लंबित निरीक्षण' },
  high_risk_spillways: { EN: 'High-Risk Spillways', HI: 'उच्च जोखिम वाले स्पिलवे' },
  active_alerts: { EN: 'Active Alerts', HI: 'सक्रिय आपातकालीन चेतावनियाँ' },
  drone_missions: { EN: 'Drone Flight Missions', HI: 'ड्रोन उड़ान मिशन' },
  ai_defect_detection: { EN: 'AI Defect Detection', HI: 'एआई दोष पहचान' },
  verified_defects: { EN: 'Verified Defects', HI: 'सत्यापित दोष' },
  work_orders: { EN: 'Active Work Orders', HI: 'रखरखाव कार्य आदेश' },

  // Risk Levels & Severities
  risk_high: { EN: 'High Risk', HI: 'उच्च जोखिम' },
  risk_critical: { EN: 'Critical Risk', HI: 'गंभीर जोखिम' },
  risk_medium: { EN: 'Moderate Risk', HI: 'मध्यम जोखिम' },
  risk_low: { EN: 'Low Risk', HI: 'कम जोखिम' },
  severity_critical: { EN: 'Critical', HI: 'अत्यंत गंभीर' },
  severity_high: { EN: 'High', HI: 'उच्च' },
  severity_medium: { EN: 'Medium', HI: 'मध्यम' },
  severity_low: { EN: 'Low', HI: 'निम्न' },

  // Defect Categories
  defect_spalling: { EN: 'Concrete Spalling', HI: 'कंक्रीट क्षरण (Spalling)' },
  defect_crack: { EN: 'Structural Crack', HI: 'संरचनात्मक दरार' },
  defect_seepage: { EN: 'Water Seepage', HI: 'जल रिसाव' },
  defect_erosion: { EN: 'Scour & Erosion', HI: 'मृदा क्षरण / कटाव' },
  defect_vegetation: { EN: 'Vegetation Growth', HI: 'वनस्पति वृद्धि' },
  defect_joint: { EN: 'Joint Displacement', HI: 'जोड़ विस्थापन' },

  // Footer & Auth
  footer_copyright: {
    EN: '© 2026 HydroVision AI. Central Dam Safety Organisation (CDSO), Ministry of Jal Shakti, Government of India.',
    HI: '© 2026 हाइड्रोविज़न एआई। केंद्रीय बाँध सुरक्षा संगठन (CDSO), जल शक्ति मंत्रालय, भारत सरकार।',
  },
  footer_privacy: { EN: 'Privacy Policy', HI: 'गोपनीयता नीति' },
  footer_terms: { EN: 'Terms of Service', HI: 'सेवा की शर्तें' },
  footer_ndsa: { EN: 'NDSA Guidelines 2021', HI: 'एनडीएसए दिशानिर्देश 2021' },
  footer_helpdesk: { EN: 'National Dam Safety Helpdesk', HI: 'राष्ट्रीय बाँध सुरक्षा हेल्पलाइन' },

  // Login Page
  login_welcome: { EN: 'National Infrastructure Security Portal', HI: 'राष्ट्रीय अवसंरचना सुरक्षा पोर्टल' },
  login_select_role: { EN: 'Select Operational Portal', HI: 'परिचालन पोर्टल का चयन करें' },
  login_button: { EN: 'Access Secure Portal', HI: 'सुरक्षित पोर्टल में प्रवेश करें' },
  login_disclaimer: {
    EN: 'Official System of Ministry of Jal Shakti. Unauthorized access is punishable under IT Act 2000 & Dam Safety Act 2021.',
    HI: 'जल शक्ति मंत्रालय की आधिकारिक प्रणाली। अनाधिकृत प्रवेश आईटी अधिनियम 2000 एवं बाँध सुरक्षा अधिनियम 2021 के तहत दंडनीय है।',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(
    (localStorage.getItem('hydro_lang') as Language) || 'EN'
  );
  const [fontSize, setFontSizeState] = useState<FontSize>(
    (localStorage.getItem('hydro_fontsize') as FontSize) || 'normal'
  );

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('hydro_lang', lang);
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem('hydro_fontsize', size);
  };

  useEffect(() => {
    document.documentElement.classList.remove('font-size-normal', 'font-size-large', 'font-size-xlarge');
    document.documentElement.classList.add(`font-size-${fontSize}`);
  }, [fontSize]);

  const t = (key: string): string => {
    if (translations[key] && translations[key][language]) {
      return translations[key][language];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, fontSize, setFontSize, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

