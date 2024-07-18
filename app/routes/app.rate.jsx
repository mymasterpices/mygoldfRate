import { authenticate } from "~/shopify.server"; // Adjust the import path as needed

// Example of a function to convert objects to JSON
const toJson = (obj) => {
  return JSON.stringify(obj);
};

export const loader = async ({ request }) => {
  try {
    // Authenticate and retrieve session details
    const { session } = await authenticate.admin(request);
    const { shop, accessToken } = session;

    const apiVersion = '2024-07'; // Replace with your Shopify API version
    const graphqlEndpoint = `https://${shop}/admin/api/${apiVersion}/graphql.json`;

    const query = `
      query {
        products(first: 250) {
          edges {
            node {
              id
              title
              tags
              metafields(first: 10) {
                edges {
                  node {
                    key
                    value
                  }
                }
              }
              variants(first: 1) {
                edges {
                  node {
                    id
                    price
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(graphqlEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }

    const { data } = await response.json();
    const products = data.products.edges;

    const goldRate = 7000; // Assuming gold rate is 7000 per gram

    for (const { node } of products) {
      const productId = node.id;
      const productTags = node.tags;
      const productMetafields = node.metafields.edges;
      const variantId = node.variants.edges[0]?.node.id;
      let currentPrice = node.variants.edges[0]?.node.price;

      // Check if the product has the 'Gold_22K' tag and 'custom.gold_weight' metafield
      const hasGold22KTag = productTags.includes('Gold_22K');
      const goldWeightMetafield = productMetafields.find(metafield => metafield.node.key === 'custom.gold_weight');

      if (hasGold22KTag && goldWeightMetafield) {
        const goldWeight = parseFloat(goldWeightMetafield.node.value);
        const newPrice = goldWeight * goldRate;
        // alert( newPrice);
        // Update the product price if it has changed
        if (newPrice !== currentPrice) {
          const updatePriceMutation = `
            mutation {
              productVariantUpdate(input: {
                id: "${variantId}",
                price: "${newPrice}"
              }) {
                product {
                  id
                }
              }
            }
          `;

          const updateResponse = await fetch(graphqlEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Shopify-Access-Token": accessToken,
            },
            body: JSON.stringify({ query: updatePriceMutation }),
          });

          if (!updateResponse.ok) {
            throw new Error('Failed to update product price');
          }

          console.log(`Updated price for Product ID ${productId} to ${newPrice}`);
        }
      }
    }

    // Return JSON response using the toJson function or JSON.stringify
    return toJson({ success: true });
  } catch (err) {
    console.error(err);
    // Return JSON error response using the toJson function or JSON.stringify
    return toJson({ error: err.message });
  }
};



