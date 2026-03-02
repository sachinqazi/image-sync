import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json());

const SHOP = process.env.SHOP;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

app.post("/webhook/product-update", async (req, res) => {
  const product = req.body;

  try {
    // 1️⃣ Get metafields
    const metafieldRes = await axios.get(
      `https://${SHOP}/admin/api/2024-01/products/${product.id}/metafields.json`,
      {
        headers: { "X-Shopify-Access-Token": ACCESS_TOKEN },
      }
    );

    const imageSet = metafieldRes.data.metafields.find(
      (m) => m.key === "image_set"
    );

    if (!imageSet) return res.sendStatus(200);

    const urls = JSON.parse(imageSet.value);

    // 2️⃣ Get existing product media
    const mediaRes = await axios.get(
      `https://${SHOP}/admin/api/2024-01/products/${product.id}/images.json`,
      {
        headers: { "X-Shopify-Access-Token": ACCESS_TOKEN },
      }
    );

    // 3️⃣ Delete all existing images
    for (const image of mediaRes.data.images) {
      await axios.delete(
        `https://${SHOP}/admin/api/2024-01/products/${product.id}/images/${image.id}.json`,
        {
          headers: { "X-Shopify-Access-Token": ACCESS_TOKEN },
        }
      );
    }

    // 4️⃣ Add new images
    for (const url of urls) {
      await axios.post(
        `https://${SHOP}/admin/api/2024-01/products/${product.id}/images.json`,
        {
          image: {
            src: typeof url === "string" ? url : url.href,
          },
        },
        {
          headers: { "X-Shopify-Access-Token": ACCESS_TOKEN },
        }
      );
    }

    res.sendStatus(200);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.sendStatus(500);
  }
});

app.listen(10000, () => console.log("Server running"));
