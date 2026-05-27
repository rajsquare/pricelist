import fs from 'fs';
import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function syncProducts() {
  const snapshot = await db.collection('products').get();

  const products = snapshot.docs
    .map((doc) => {
      const data = doc.data();

      return {
        sr: Number(data.sr),
        productName: String(data.productName ?? ''),
        wPrice: data.wPrice ?? null,
        priceType: String(data.priceType ?? ''),
        rPrice: data.rPrice ?? null,
        material: data.material ?? null,
      };
    })
    .sort((a, b) => a.sr - b.sr);

  fs.writeFileSync(
    './public/products.json',
    JSON.stringify(products, null, 2),
  );

  console.log(`Synced ${products.length} products`);
}

syncProducts().catch((error) => {
  console.error(error);
  process.exit(1);
});