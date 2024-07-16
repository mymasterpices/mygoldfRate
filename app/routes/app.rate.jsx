import { Layout, Page, Card, Button } from "@shopify/polaris";
import { json, useLoaderData } from "@remix-run/react";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }) => {
        const { admin } = await authenticate.admin(request)

        const response = await admin.graphql(`
            #graphql
            query fetchPorducts {
                shop {
                    name
                    id
                }
            }`)
    
    const shopData = (await (await response).json()).data
    console.log(shopData);
    // return null;
    return json({
        shop: shopData.shop
    })
        
}

export default function Rate() {
    const { shop } = useLoaderData();
    return (
        <Page>
            <Layout>
                <Layout.Section>
                    <Card>
                        <h2>Products</h2>
                        <h2>Shop Name: {shop.name}.myshopify.com</h2>
                    </Card>
                </Layout.Section>
                <Layout.Section>
                    <Button  onClick={()=> shopify.toast.show("Displaying the shop name")}
                    variant="primary">Update</Button>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
