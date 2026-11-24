// ---- CONFIG ----
// Leave firebase as null to run in LOCAL MODE (demo: progress is saved only in this browser).
// To go live, paste your Firebase web config here (see DEPLOY.md). No secret keys are stored here.
window.CW_CONFIG = {
  firebase: null,
  /* firebase: { apiKey:"...", authDomain:"...", projectId:"...", appId:"..." }, */
  enableGoogle: true,           // show "Sign in with Google" (needs Google enabled in Firebase Auth)
  localClassCode: "WRITE2026",  // local mode only
  localTutorPassword: "tutor",  // local mode only: username "tutor"
  courseName: "Creative Writing Studio",
  totalWeeks: 32
};
