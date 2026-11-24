// ---- CONFIG ----
// Leave firebase as null to run in LOCAL MODE (demo: progress is saved only in this browser).
// To go live, paste your Firebase web config here (see DEPLOY.md). No secret keys are stored here.
window.CW_CONFIG = {
  firebase: {
    apiKey: "AIzaSyBNpTVJTqf53ppB_7V_nY3Njw6jUXuwZ7g",
    authDomain: "education-nation-2bfff.firebaseapp.com",
    projectId: "education-nation-2bfff",
    storageBucket: "education-nation-2bfff.firebasestorage.app",
    messagingSenderId: "521196481665",
    appId: "1:521196481665:web:9a88c6b626c8c326453180"
  },
  /* firebase: { apiKey:"...", authDomain:"...", projectId:"...", appId:"..." }, */
  enableGoogle: true,           // show "Sign in with Google" (needs Google enabled in Firebase Auth)
  localClassCode: "WRITE2026",  // local mode only
  localTutorPassword: "tutor",  // local mode only: username "tutor"
  courseName: "Creative Writing Studio",
  totalWeeks: 32
};
