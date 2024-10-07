import { Hono } from 'hono';

// Define the type of the expected response from your gold API
interface GoldApiResponse {
  city: string;
  price: number;
  timestamp: string;
}

const app = new Hono<{
  Bindings: {
    BACKEND_URL: string;
  };
}>();

// Define a route for the root path
app.get('/', async (c) => {
  try {
    return c.text('Hello Hono!');
  } catch (error) {
    console.error('Error in root route:', error);
    return c.text('Internal Server Error', 500);
  }
});

// Gold price update function
async function updateGoldPrice(env: { BACKEND_URL: string }) {
  try {
    const response = await fetch('https://gold-api-pi.vercel.app/');

    // Check if the response is OK
    if (!response.ok) {
      throw new Error('Failed to fetch data from the gold API');
    }

    // Parse the response as a GoldApiResponse
    const data: GoldApiResponse = await response.json();

    console.log(data);

    const goldPricePerGram = data.price;

    console.log(`Fetched gold price: ${goldPricePerGram} INR per gram`);

    // Call your backend to update the gold price
    const updateGoldPriceResponse = await fetch(`${env.BACKEND_URL}/gold-price/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: goldPricePerGram }),
    });

    if (!updateGoldPriceResponse.ok) {
      throw new Error('Failed to update gold price in the database');
    }

    console.log('Gold price updated successfully in the backend.');

    // Call the update-product-prices API to change the price of every product
    const updateProductPricesResponse = await fetch(`${env.BACKEND_URL}/gold-price/update-product-prices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goldPricePerGram }), // Optional: Pass the new gold price if needed
    });

    if (!updateProductPricesResponse.ok) {
      throw new Error('Failed to update product prices');
    }

    console.log('Product prices updated successfully based on the new gold price.');

  } catch (error) {
    console.error('Error updating gold prices:', error);
  }
}

// Schedule the job using Cloudflare Cron Triggers
async function scheduled(event: any, env: { BACKEND_URL: string }, ctx: ExecutionContext) {
  console.log('Scheduled job triggered');
  await updateGoldPrice(env);
}

app.get('/test-update', async (c) => {
  const env = {
    BACKEND_URL: c.env.BACKEND_URL,
  };
  await updateGoldPrice(env);
  return c.text('Update function executed.');
});

export default {
  fetch: app.fetch,
  scheduled: scheduled
};