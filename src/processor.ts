import { Store } from "n3";
import { rdfSerializer } from "rdf-serialize";
import { streamifyArray } from 'streamify-array';
import { frame } from "jsonld"
import { Quad, Quad_Object, Quad_Subject } from "rdf-js";
import { rdfParser } from "rdf-parse";
import { ODRL, RDF } from "./vocabulary";
import { extractSubTree } from "./atomizer";
import { Frame, JsonLdObj } from "jsonld/jsonld-spec";
const stringifyStream = require('stream-to-string');

type RuleType = "permission" | "prohibition" | "obligation";

export async function processRDF(input: string, contentType: string): Promise<Quad[]> {
    return new Promise((resolve, reject) => {
        const textStream = require('streamify-string')(input);
        const quads: Quad[] = []
        rdfParser.parse(textStream, { contentType: 'application/ld+json', baseIRI: 'http://example.org' })
            .on('data', (quad) => quads.push(quad))
            .on('error', (error) => { reject(error) })
            .on('end', () => {
                resolve(quads)
            });
    })
}

export async function framePolicies(store: Store, policyFrame?: Frame): Promise<JsonLdObj> {
    const quadStream = streamifyArray(store.getQuads(null, null, null, null));
    const textStream = rdfSerializer.serialize(quadStream, { contentType: 'application/ld+json' });
    const jsonContent = JSON.parse(await stringifyStream(textStream))
    policyFrame = policyFrame || {
        "@context": "http://www.w3.org/ns/odrl.jsonld",
        "@type": [ "Policy", "Set", "Offer", "Agreement", "Request" ]
    }
    const framed = await frame(jsonContent, policyFrame);
    return framed;
}

export async function frameRule(store: Store, ruleFrame?: Frame): Promise<JsonLdObj> {
    const quadStream = streamifyArray(store.getQuads(null, null, null, null));
    const textStream = rdfSerializer.serialize(quadStream, { contentType: 'application/ld+json' });
    const jsonContent = JSON.parse(await stringifyStream(textStream))
    ruleFrame = ruleFrame || {
        "@context": "http://www.w3.org/ns/odrl.jsonld",
        "target": {},
        "action": {},
        "assigner": {},
        "assignee": {},
    }
    const framed = await frame(jsonContent, ruleFrame);
    return framed;
}

export async function extractPoliciesFromStore(store: Store): Promise<{id: string, quads: Quad[]}[]> {
    const policySubjects: Set<Quad_Subject> = new Set(
        [ 
            ...(store.getSubjects(RDF.type, ODRL.Policy, null)), 
            ...(store.getSubjects(RDF.type, ODRL.Set, null)), 
            ...(store.getSubjects(RDF.type, ODRL.Offer, null)), 
            ...(store.getSubjects(RDF.type, ODRL.Agreement, null)), 
            ...(store.getSubjects(RDF.type, ODRL.Request, null)), 
        ]
    );
    return Array.from(policySubjects).map(id => {
        const quads = extractSubTree(store, id)
        return ({id: id.value, quads})
    })
}

export async function extractFramedPoliciesFromStore(store: Store, frame?: Frame): Promise<Object[]> {
    const policySubjects: Set<Quad_Subject> = new Set(
        [ 
            ...(store.getSubjects(RDF.type, ODRL.Policy, null)), 
            ...(store.getSubjects(RDF.type, ODRL.Set, null)), 
            ...(store.getSubjects(RDF.type, ODRL.Offer, null)), 
            ...(store.getSubjects(RDF.type, ODRL.Agreement, null)), 
            ...(store.getSubjects(RDF.type, ODRL.Request, null)), 
        ]
    );
    return Promise.all(Array.from(policySubjects).map(async (id) => {
        const quads = extractSubTree(store, id)
        const framed = await framePolicies(new Store(quads), frame)
        return framed
    }))
}

export async function extractRulesFromStore(store: Store): Promise<{type: RuleType, quads: Quad[]}[]> {
    const permSubjects = store.getObjects(null, ODRL.permission, null);
    const obligSubjects = store.getObjects(null, ODRL.obligation, null);
    const prohSubjects = store.getObjects(null, ODRL.prohibition, null);

    let results: {type: RuleType, quads: Quad[]}[] = []

    for (let { subjectList, type } of [
        { subjectList: permSubjects, type: "permission" as RuleType },
        { obligSubjects: obligSubjects, type: "obligation" as RuleType },
        { prohSubjects: prohSubjects, type: "prohibition" as RuleType },
    ]) {
        if (!subjectList) continue
        results = results.concat(
            subjectList.filter(id => id.termType !== 'Literal').map(id => {
                const quads = extractSubTree(store, id as Quad_Subject)
                return ({type, quads})
            })
        )
    }
    return results
}

export async function extractFramedRulesFromStore(store: Store, frame?: Frame): Promise<{type: RuleType, rule: Object}[]> {
    const ruleQuads = await extractRulesFromStore(store);
    return Promise.all(ruleQuads.map(async ({ type, quads }) => {
        return ({type, rule: await frameRule(new Store(quads), frame) })
    }))
}