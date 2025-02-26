import { Store } from "n3";
import { rdfSerializer } from "rdf-serialize";
import { streamifyArray } from 'streamify-array';
import { frame } from "jsonld"
const stringifyStream = require('stream-to-string');

export async function framePolicy(store: Store) {
    const quadStream = streamifyArray(store.getQuads(null, null, null, null));
    const textStream = rdfSerializer.serialize(quadStream, { contentType: 'application/ld+json' });

    const jsonContent = JSON.parse(await stringifyStream(textStream))

    const policyFrame = {
        "@context": "http://www.w3.org/ns/odrl.jsonld",
        "@type": "Set",
    }

    const framed = await frame(jsonContent, policyFrame);

    return framed;

}