
import {
  Page,
  Layout,
  Card,
  Button, BlockStack, EmptyState, Text, Spinner
} from "@shopify/polaris";
import { authenticate } from "~/shopify.server"; // Adjust the import path as needed
import { TitleBar } from "@shopify/app-bridge-react";
import { json } from "@remix-run/node"; // Import the json function from the Remix framework
import React, { useState, useEffect } from 'react';

import { useFetcher, Form } from "@remix-run/react";

// Import Prisma db -> import gold rate from prisma db
import db from "../db.server";

export const action = async ({ request }) => {
  //Get data from database
  let getGoldRate = await db.Price.findFirst();
  //Get gold_rate_22K from database
  console.log("New Gold Rate -->", getGoldRate.gold_rate_22K);

  try {
    // Authenticate and retrieve session details
    const { session } = await authenticate.admin(request);
    const { shop, accessToken } = session;

    const apiVersion = '2024-07'; // Replace with your Shopify API version
    const graphqlEndpoint = `https://${shop}/admin/api/${apiVersion}/graphql.json`;

    const query = `
      query($cursor: String) {
        products(first: 250, after: $cursor) {
          edges {
            node {
              id
              title
              tags
              metafields(first: 10) {
                edges {
                  node {
                    namespace
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
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    let hasNextPage = true;
    let endCursor = null;
    const allProducts = [];

    while (hasNextPage) {
      const response = await fetch(graphqlEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query,
          variables: { cursor: endCursor },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const { data } = await response.json();
      const products = data.products.edges;
      const pageInfo = data.products.pageInfo;

      allProducts.push(...products);
      hasNextPage = pageInfo.hasNextPage;
      endCursor = pageInfo.endCursor;
    }

    const goldRate = getGoldRate.gold_rate_22K; // assigning gold rate per grams
    const gold22KProducts = allProducts.filter(({ node }) => node.tags.includes('Gold_22K'));

    const updatedProducts = [];

    for (const { node } of gold22KProducts) {
      const goldWeightMetafield = node.metafields.edges.find(
        (metafield) => metafield.node.namespace === 'custom' && metafield.node.key === 'gold_weight'
      );

      if (goldWeightMetafield) {
        const goldWeight = JSON.parse(goldWeightMetafield.node.value).value;

        const newPrice = (goldWeight * goldRate).toFixed(2);
        //Display new price in console
        console.log(newPrice);

        const variantId = node.variants.edges[0]?.node.id;

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

        // console.log(updateResponse);

        if (!updateResponse.ok) {
          throw new Error('Failed to update product price');
        }


        updatedProducts.push({
          id: node.id,
          title: node.title,
          oldPrice: node.variants.edges[0]?.node.price,
          newPrice,
        });

      }
    }

    return json({ success: true, updatedProducts });
  } catch (err) {
    console.error(err);
    return json({ error: err.message });
  }
};


export default function goldRate() {

  const fetcher = useFetcher();
  const [loading, setLoading] = useState(false);

  // Detect the fetcher's state change
  useEffect(() => {
    if (fetcher.state === "submitting") {
      setLoading(true);
    } else if (fetcher.state === "idle") {
      setLoading(false);
    }
  }, [fetcher.state]);

  const updateNewprice = () => {
    fetcher.submit({}, { method: "POST" });
  };
  return (
    <Page>
      <TitleBar title="Gold Product Price">

      </TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack>
                <Text variant="headingMd" as="h2">Set new gold rate to the whole store</Text>
                <Form method="POST">
                  <p>The new gold product prcing will acffact the product rate in live website</p>
                  <br />
                  <Button variant="primary" onClick={updateNewprice} disabled={loading}>
                    {loading ? 'Updating...' : 'Apply rates to all products'}
                    {loading && <Spinner size="small" />}
                  </Button>

                </Form>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}


