
import { rdfParser } from "rdf-parse";
import { readFileSync } from "fs"
import { Quad } from "rdf-js";
import { atomize } from "./atomizer";
import { framePolicy } from "./processor";

async function runTest() {

    const policy = readFileSync('./test/data.jsonld', { encoding: 'utf-8' })
    const textStream = require('streamify-string')(policy);

    const quads: Quad[] = []
    
    rdfParser.parse(textStream, { contentType: 'application/ld+json', baseIRI: 'http://example.org' })
        .on('data', (quad) => quads.push(quad))
        .on('error', (error) => console.error(error))
        .on('end', () => {
            const atomizedPoliciesStore = atomize(quads)
            framePolicy(atomizedPoliciesStore).then(console.log)
        });

        
}

runTest();