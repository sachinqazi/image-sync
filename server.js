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
    // Fetch metafields
    const metafieldRes = await axios.get(
      `https://${SHOP}/admin/api/2024-01/products/${product.id}/metafields.json`,
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
      }
    );

    const imageSet = metafieldRes.data.metafields.find(
      (m) => m.key === "image_set"
    );

    if (!imageSet) return res.sendStatus(200);

    const urls = JSON.parse(imageSet.value);

    const mediaInputs = urls.map((url) => ({
      originalSource: typeof url === "string" ? url : url.href,
      mediaContentType: "IMAGE",
    }));

    const mutation = `
      mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
        productCreateMedia(media: $media, productId: $productId) {
          media { status }
          mediaUserErrors { message }
        }
      }
    `;

    await axios.post(
      `https://${SHOP}/admin/api/2024-01/graphql.json`,
      {
        query: mutation,
        variables: {
          productId: `gid://shopify/Product/${product.id}`,
          media: mediaInputs,
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
          "Content-Type": "application/json",
        },
      }
    );

    res.sendStatus(200);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.sendStatus(500);
  }
});

app.listen(10000, () => console.log("Server running"));