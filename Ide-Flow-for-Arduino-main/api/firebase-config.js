export default function handler(req, res) {
  const config = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyATV7WxXcGVrkCVitwH8qsdD88YQnYd6eI",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "ide-user.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "ide-user",
    appId: process.env.FIREBASE_APP_ID || "1:960891528194:web:0dad346a10cf16797f731b",
  };

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(config);
}
