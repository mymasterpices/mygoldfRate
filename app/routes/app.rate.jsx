import { useLoaderData } from "@remix-run/react";
import { Card, Layout, Page, Spinner } from "@shopify/polaris";
import { json } from "@remix-run/node";
import { apiVersion, authenticate } from "~/shopify.server";

// Gold rate from prisma database
import { PrismaClient } from '@prisma/client';



const query = `
  query($first: Int!, $after: String) {
    products(first: $first, after: $after, query: "tag:Gold_22K") {
      edges {
        node {
          id
          title
          priceRange {
            minVariantPrice {
              amount
            }
          }
          metafields(first: 10, namespace: "custom") {
            edges {
              node {
                key
                value
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


export const loader = async ({ request }) => {
  
  const { session } = await authenticate.admin(request);
  const { shop, accessToken } = session;

  let allProducts = [];
  let hasNextPage = true;
  let endCursor = null;

  try {
    while (hasNextPage) {
      const response = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query,
          variables: { first: 50, after: endCursor },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const { data } = await response.json();
      const { edges, pageInfo } = data.products;

      allProducts = [...allProducts, ...edges];
      hasNextPage = pageInfo.hasNextPage;
      endCursor = pageInfo.endCursor;
    }

    return json({ products: allProducts });
  } catch (err) {
    console.error(err);
    return json({ products: [], error: err.message });
  }

};






const Products = () => {
  const { products, error } = useLoaderData();


  return (
      <Page title="Products with Tag 'Gold_22K'">
           <Layout>
                {products.length > 0 ? (
                products.map(({ node }) => {
                    // Parse the metafield value JSON
                    let goldWeightValue = null;
                    if (node.metafields.edges.length > 0) {
                    const metafieldValue = JSON.parse(node.metafields.edges[0].node.value);
                    goldWeightValue = metafieldValue.value;
                    }

                    return (
                    <Layout.Section key={node.id}>
                        <Card>
                        <p>Title: {node.title}</p>
                        <p>Product Id: {node.id }</p>
                        <p>Price: {node.priceRange.minVariantPrice.amount}</p>
                        {goldWeightValue && (
                            <p>Gold Weight: {goldWeightValue}</p>
                        )}
                        </Card>
                    </Layout.Section>
                    );
                })
                ) : (
                <p>No products found with the tag 'Gold_22K'.</p>
                )}
            </Layout>
    </Page>
  );
};

export default Products;
