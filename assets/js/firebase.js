import { firebaseConfig, functionsRegion } from "./config.js";
import { demoQuestions, demoExams } from "./sample-data.js";

const firebaseVersion = "13.1.0";
const base = `https://www.gstatic.com/firebasejs/${firebaseVersion}`;

let app = null;
let auth = null;
let db = null;
let functions = null;
let sdk = null;
let configured = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.databaseURL && firebaseConfig.projectId && firebaseConfig.appId);

if (configured) {
  try {
    const [appSdk, authSdk, dbSdk, functionsSdk] = await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-auth.js`),
      import(`${base}/firebase-database.js`),
      import(`${base}/firebase-functions.js`)
    ]);
    sdk = { ...authSdk, ...dbSdk, ...functionsSdk };
    app = appSdk.initializeApp(firebaseConfig);
    auth = authSdk.getAuth(app);
    await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);
    db = dbSdk.getDatabase(app);
    functions = functionsSdk.getFunctions(app, functionsRegion);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    configured = false;
  }
}

export const firebaseReady = configured;
export const authService = auth;
export const database = db;
export const functionsService = functions;
export const firebaseSdk = sdk;
export const localDemoQuestions = demoQuestions;
export const localDemoExams = demoExams;

export function getFunctionsClient() { return sdk; }
