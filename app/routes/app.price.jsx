import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  BlockStack,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useState } from "react";
import { json } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";

// Import Prisma db
import db from "../db.server";

// Get data from database
export async function loader() {
  let oldPrice = await db.Price.findFirst();
  console.log("Gold price from database ------->", oldPrice);
  return json(oldPrice);
}

export async function action({ request }) { // Destructure request here
  // Save data to database
  let newPrice = await request.formData();
  let Price = Object.fromEntries(newPrice);

  console.log(Price);

  // Update database price
  await db.Price.upsert({
    where: {
      id: "1",
    },
    update: {
      id: "1",
      gold_rate_22K: Price.gold_rate_22K,
      gold_rate_18K: Price.gold_rate_18K,
    },
    create: {
      id: "1",
      gold_rate_22K: Price.gold_rate_22K,
      gold_rate_18K: Price.gold_rate_18K,
    },
  });

  return json({ message: "Setting updated" });
}

export default function PricePage() {
  const oldPrice = useLoaderData();
  const [formState, setFormState] = useState(oldPrice);

  return (
    <Page>
      <TitleBar title="Metal Price " />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Form method="POST">
                <TextField
                  value={formState?.gold_rate_22K}
                  onChange={(value) =>
                    setFormState({
                      ...formState,
                      gold_rate_22K: value,
                    })
                  }
                  label="22K Gold Rate"
                  type="text"
                  autoComplete="off"
                  name="gold_rate_22K"
                  helpText={<span>Enter 22k Gold rate</span>}
                />
                <TextField
                  value={formState?.gold_rate_18K}
                  onChange={(value) =>
                    setFormState({
                      ...formState,
                      gold_rate_18K: value,
                    })
                  }
                  label="18K Gold Rate"
                  type="text"
                  autoComplete="off"
                  name="gold_rate_18K"
                  helpText={<span>Enter 18k Gold rate</span>}
                />
                <Button variant="primary" submit={true}>
                  Save
                </Button>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function Code({ children }) {
  return (
    <Box
      as="span"
      padding="025"
      paddingInlineStart="20"
      paddingInlineEnd="20"
      background="bg-surface-active"
      borderWidth="025"
      borderColor="border"
      borderRadius="100"
    >
      <code>{children}</code>
    </Box>
  );
}
