
import { useLoaderData } from "@remix-run/react";
import {Card, Layout, Page} from "@shopify/polaris";
import { apiVersion, authenticate} from "~/shopify.server";
import { loaderFunction } from "@remix-run/node";


export const query =`{
    collections(first: 10){
        edges{
            node{
                id
                handle
                title
                description
                tags
            }
        }
        pageInfo{
            hasNextPage
        }
    }
}`

export const loader: loaderFunction = async({ request }) =>{
    const {session} = await authenticate.admin(request)
    const {shop, accessToken} = session;

    try{
        const response = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`,{
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-shopify-Access-Token": accessToken
            },
            body: query
        });

        if(response.status){
            const data = await response.json();
            const{
                data: {
                    collections: { edges }
                }
            } = data ;
            return edges;

        }
        return null;
    } catch(err){
        console.log(err);
    }
}

const Products =  () =>{
    const collections: any = useLoaderData();
    console.log(collections, collections list);

    return 
    <div> 

    
   
    </div>;
}

export default Products;