import React, { useState } from 'react';
import { Page, Layout, Card, Button, BlockStack, Text } from '@shopify/polaris';
import { TitleBar } from '@shopify/app-bridge-react';
import { Form, useSubmit, useActionData } from '@remix-run/react';
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import db from '../db.server'; // Import your Prisma DB

export async function action({ request }) {
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
    const updatedProducts = [];

    while (hasNextPage) {
      const response = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
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

      // Filter products with the tag "Gold_22K"
      const gold22KProducts = products.filter(({ node }) =>
        node.tags.includes('Gold_22K')
      );

      // Use a for...of loop for proper async handling
      for (const { node } of gold22KProducts) {
        const goldWeightMetafield = node.metafields.edges.find(
          (metafield) =>
            metafield.node.namespace === 'custom' &&
            metafield.node.key === 'gold_weight'
        );

        const makingChargesMetafield = node.metafields.edges.find(
          (metafield) =>
            metafield.node.namespace === 'custom' &&
            metafield.node.key === 'making_charges'
        );

        const goldWeight = goldWeightMetafield ? parseFloat(goldWeightMetafield.node.value) : 0;
        const makingCharges = makingChargesMetafield ? parseFloat(makingChargesMetafield.node.value) : 0;

        // Check if the required fields are available to calculate the new price
        if (goldWeight && makingCharges) {
          let myData;
          try {
            myData = await db.goldGSTRates.findFirst();
          } catch (dbError) {
            throw new Error('Failed to fetch gold rates from the database.');
          }

          console.log('Getting Gold & GST rate to Prisma DB successfully');

          if (!myData) {
            throw new Error('No gold rate data found in the database.');
          }

          const goldRate = myData.gold_rate_22K;
          const gstRate = myData.gstRate;

          const goldActualPrice = goldRate * goldWeight;
          const goldMakingAmount = goldActualPrice * makingCharges / 100;
          const gstAmount = (goldMakingAmount + goldActualPrice) * gstRate / 100;
          const calcPrice = (goldMakingAmount + goldActualPrice) + gstAmount;

          const newPrice = calcPrice.toFixed(2);

          console.log(newPrice);
          const variantId = node.variants.edges[0]?.node.id;

          if (variantId) {
            console.log(`Preparing to update variant: ${variantId} with new price: ${newPrice}`);
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

            try {
              const updateResponse = await fetch(graphqlEndpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Shopify-Access-Token': accessToken,
                },
                body: JSON.stringify({ query: updatePriceMutation }),
              });

              if (!updateResponse.ok) {
                console.error(`Failed to update price for product ${node.id}`);
              } else {
                const updateData = await updateResponse.json();
                console.log(`Price updated successfully for variant`);

                updatedProducts.push({
                  id: node.id,
                  title: node.title,
                  oldPrice: node.variants.edges[0]?.node.price,
                  newPrice,
                });
              }
            } catch (updateError) {
              console.error(`Error while updating price for variant`);
            }
          }
        }
      }

      hasNextPage = pageInfo.hasNextPage;
      endCursor = pageInfo.endCursor;
    }

    console.log('All products processed. Updated products:', updatedProducts);

    return json({ success: true, updatedProducts, totalAffected: updatedProducts.length });
  } catch (err) {
    console.error('Error during processing:', err.message);
    return json({ error: err.message });
  }
}

export default function Apply() {
  const [isLoading, setIsLoading] = useState(false);
  const [buttonText, setButtonText] = useState('Update products');
  const actionData = useActionData(); // Get action data to check if the process is complete
  const submit = useSubmit();

  React.useEffect(() => {
    if (actionData && actionData.success) {
      setIsLoading(false);
      setButtonText('Done');
    } else if (actionData && actionData.error) {
      setIsLoading(false);
      setButtonText('Failed');
    }
  }, [actionData]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsLoading(true);
    setButtonText('Updating...');
    submit(event.currentTarget, {
      method: 'post',
    });
  };

  return (
    <Page>
      <TitleBar title="Update GOLD price" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack>
                <Text variant="headingMd" as="h2">
                  Set new gold rate to the whole store
                </Text>
                <Form method="post" onSubmit={handleSubmit}>
                  <p>
                    The new gold product pricing will affect the product rate on the live website.
                  </p>
                  <br />
                  <Button variant="primary" submit disabled={isLoading}>
                    {buttonText}
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
