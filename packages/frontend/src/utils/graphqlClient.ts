import {ApolloClient, InMemoryCache, HttpLink, split, ApolloLink} from '@apollo/client/core';
import { getMainDefinition } from '@apollo/client/utilities';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import {setContext} from "@apollo/client/link/context";
import {AuthenticationToken} from "@caido/sdk-frontend/src/types/__generated__/graphql-sdk";

const graphqlHost = window.location.host;

function getAuthToken():AuthenticationToken {
    console.log(JSON.parse(localStorage.getItem("CAIDO_AUTHENTICATION")));
    return JSON.parse(localStorage.getItem("CAIDO_AUTHENTICATION"))
}
// Create an auth link
const authLink = setContext((_, { headers }) => {
    const token = getAuthToken();
    console.log("WS token", token);
    return {
        headers: {
            ...headers,
            Authorization: token ? `Bearer ${token.accessToken}` : "",
        }
    }
});

// Define the HTTP link for queries and mutations
const httpLink = new HttpLink({

    uri: `http://${graphqlHost}/graphql`, // Replace with your GraphQL server URL
});


// Define the WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(createClient({
    url: `ws://${graphqlHost}/ws/graphql`, // Replace with your GraphQL WebSocket URL
    reconnect: true,
    connectionParams: () => {
        const token = getAuthToken();
        return {
            Authorization: `Bearer ${token.accessToken}`,
        };
    },
}));


// Split links, so that subscriptions go over WebSocket
const splitLink = split(
    ({ query }) => {
        const definition = getMainDefinition(query);
        return (
            definition.kind === 'OperationDefinition' &&
            definition.operation === 'subscription'
        );
    },
    wsLink,
    httpLink
);


// Create the Apollo Client instance
export const client = new ApolloClient({
    link: authLink.concat(splitLink),
    cache: new InMemoryCache(),
});