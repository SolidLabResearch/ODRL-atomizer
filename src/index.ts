
import { rdfParser } from "rdf-parse";
import { readFileSync } from "fs"
import { Quad } from "rdf-js";
import { atomize } from "./atomizer";
import { extractFramedPoliciesFromStore, extractFramedRulesFromStore, extractPoliciesFromStore, extractRulesFromStore, framePolicies, processRDF } from "./processor";
import { Store } from "n3";
import { Frame } from "jsonld/jsonld-spec";

export class PolicyAtomizer {

    private inputStore: Store;
    private loadingStack: Promise<void>[] = [];
    private atomizedStore?: Promise<Store>;
    constructor() {
        this.inputStore = new Store();
    }

    public loadQuads (quads: Quad[]) {
        this.inputStore.addQuads(quads)
        return this;
    }

    public loadRDF (text: string, contentType: string) {
        const promise = new Promise<void>((resolve, reject) => {
            const promise = processRDF(text, contentType).then(quads => {
                this.inputStore.addQuads(quads);
                resolve()
            })
        })
        this.loadingStack.push(promise);
        return this;
    }

    public atomize() {
        this.atomizedStore = new Promise((resolve, reject) => {
            Promise.all(this.loadingStack).then(_ignored => {
                resolve(atomize(this.inputStore))
           })
        })
        return this;
    }

    // -- get policies as { id: policyId, quads } --
    public async getPolicies() {
        if(!this.atomizedStore) throw new Error('Extracting done before atomizing policies')
        const store = await this.atomizedStore;
        return await extractPoliciesFromStore(store)
    }
    // -- get policies as frame --
    public async getFramedPolicies(frame?: Frame) {
        if(!this.atomizedStore) throw new Error('Extracting done before atomizing policies')
        const store = await this.atomizedStore;
        return await extractFramedPoliciesFromStore(store, frame)
    }
    // -- get rules as { id: ruleId, quads } --
    public async getRules() {
        if(!this.atomizedStore) throw new Error('Extracting done before atomizing policies')
        const store = await this.atomizedStore;
        return await extractRulesFromStore(store)
    }
    // -- get rules as frame --
    public async getFramedRules(frame?: Frame) {
        if(!this.atomizedStore) throw new Error('Extracting done before atomizing policies')
        const store = await this.atomizedStore;
        return await extractFramedRulesFromStore(store, frame)
    }

}

