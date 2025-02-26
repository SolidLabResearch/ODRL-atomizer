import { BlankNode, NamedNode, Quad, Quad_Object, Quad_Subject, Term } from "rdf-js";
import { DataFactory, Literal, Store } from "n3"
import { RDF, ODRL, EX } from "./vocabulary";

const { quad, namedNode, blankNode } = DataFactory

// The atomization separates an ODRL Set/Accept/Offer/Request
// on its target, 
// The ODRL specification describes an atomic rules as follows:
//
// "At the core level, an ODRL Rule would be related to one Asset, 
// one or more Party functional roles, one Action 
// (and potentially to Constraints and/or Duties)
// 
// As a policy expresses a conjunction of rules (it defines
// rule A and B and ...), an atomization of a policy is a conjunction
// of its set of atomized rules.
// 
// In cases where the value of the policy itself does not matter,
// it can be split up into a set of policies each containing a single
// atomic rule

export function atomize(store: Store) {
    const resultStore = new Store();

    /**
     * Extract all odrl policy types
     * relevant type(s): odrl:Policy, odrl:Set, odrl:Offer, odrl:Agreement, odrl:Request
     */
    const policySubjects: Set<Quad_Subject> = new Set(
        [ 
            ...(store.getSubjects(RDF.type, ODRL.Policy, null)), 
            ...(store.getSubjects(RDF.type, ODRL.Set, null)), 
            ...(store.getSubjects(RDF.type, ODRL.Offer, null)), 
            ...(store.getSubjects(RDF.type, ODRL.Agreement, null)), 
            ...(store.getSubjects(RDF.type, ODRL.Request, null)), 
        ]
    );


    /**
     * Iterate over all policies / Offers / Agreements / Requests
     */
    for (let policySubject of policySubjects) {

        // Add the policy type to the result store to include it in the output of the atomization procedure
        resultStore.addQuads(store.getQuads(policySubject, RDF.type, null, null))

        // step 2: extract the rules
        // odrl:permission, odrl:prohibition, odrl:obligation
        const permissions = store.getObjects(policySubject, ODRL.permission, null)
        const obligations = store.getObjects(policySubject, ODRL.obligation, null)
        const prohibitions = store.getObjects(policySubject, ODRL.prohibition, null)

        const ruleSubjects = permissions.map( term => { return ({pred: namedNode(ODRL.permission as string), term})} )
                    .concat(obligations.map( term => { return ({pred: namedNode(ODRL.obligation as string), term})} ))
                    .concat(prohibitions.map( term => { return ({pred: namedNode(ODRL.prohibition as string), term})} ))
        
        // const outputPolicy = {
        //     "@context": "http://www.w3.org/ns/odrl.jsonld",
        //     uid: policySubject
        // }

        /**
         * Iterate over the rules of these policies
         * relevant predicate(s): odrl:permission, odrl:obligation, odrl:prohibition
         */
        for (const {pred, term} of ruleSubjects) {

            if (term.termType === "Literal") {
                throw new Error(`Policy rule ${term} is a literal value`)
            }

            /**
             * Duplicate all fields defined on the original policy to be defined on its rules as well
             */
            store.getQuads(policySubject, null, null, null).forEach(quad => {
                if (
                    ![
                        ODRL.permission,
                        ODRL.obligation,
                        ODRL.prohibition,
                        ODRL.uid,
                        RDF.type,
                        ODRL.profile,
                        ODRL.conflict
                    ].includes(quad.predicate.value as any)
                ) {
                    store.addQuad(
                        DataFactory.quad(term, quad.predicate, quad.object, quad.graph)
                    )
                    // We need to add these predicates and objects on the rules here
                }
            })
            
            /**
             * Iterate over the target values, and for each target value we need a new atomized policy
             * relevant predicate(s): odrl:target
             */
            const targets = separatePredicateQuads(store, namedNode(ODRL.target), term)            

            /**
             * iterate over the actions
             * relevant predicate(s): odrl:action
             */
            const actions = separatePredicateQuads(store, namedNode(ODRL.action), term)

            /**
             * iterate over the assigners
             * relevant predicate(s): odrl:action
             */
            const assigners = separatePredicateQuads(store, namedNode(ODRL.assigner), term)

            /**
             * iterate over the assignees
             * relevant predicate(s): odrl:assignee
             */
            const assignees = separatePredicateQuads(store, namedNode(ODRL.assignee), term)

            /**
             * Now for each atomization combination, we instantiate a new rule
             */
            for (const {id: targetId, quads: targetQuads} of (targets.length ? targets : [{id: undefined, quads: []}]) ) {
                for (const {id: actionId, quads: actionQuads} of (actions.length ? actions : [{id: undefined, quads: []}])) {
                    for (const {id: assignerId, quads: assignerQuads} of (assigners.length ? assigners : [{id: undefined, quads: []}])) {
                        for (const {id: assigneeId, quads: assigneeQuads} of (assignees.length ? assignees : [{id: undefined, quads: []}])) {/**
                            * Instantiate new policy in the result Store (keep same policy identifier)
                            */
                            const newRuleSubject = blankNode();
                            /**
                            * Create new rule identifier, and copy over the old rule and all common quads
                            * that are shared between each atomized instance
                            */
                            resultStore.addQuad(quad(policySubject, pred, newRuleSubject, undefined))
                            if(term && term.termType === "NamedNode") resultStore.addQuad(quad(newRuleSubject, namedNode(EX.derivedFrom), term, undefined))
                            // Extract full subtree without: parties, assets and actions
                            const subtreeQuads = extractSubTree(store, term as NamedNode|BlankNode, [
                                ODRL.target,
                                ODRL.action,
                                ODRL.assigner,
                                ODRL.assignee,
                            ]).map(q => { 
                                if(q.subject.value === term.value) {
                                    return(quad(newRuleSubject, q.predicate, q.object, q.graph))
                                } else {
                                    return q
                                } 
                            })
                            resultStore.addQuads(subtreeQuads)
                            if (targetId) resultStore.addQuads(replaceQuadSubjects(targetQuads, term, newRuleSubject))
                            if (actionId) resultStore.addQuads(replaceQuadSubjects(actionQuads, term, newRuleSubject))
                            if (assignerId) resultStore.addQuads(replaceQuadSubjects(assignerQuads, term, newRuleSubject))
                            if (assigneeId) resultStore.addQuads(replaceQuadSubjects(assigneeQuads, term, newRuleSubject))
                        }
                    }
                }
            }
        }
    }
    return resultStore
}

function separatePredicateQuads(store: Store, predicate: NamedNode, subject: Quad_Subject): {id: Quad_Object, quads: Quad[]}[] {
    const results: { id: Quad_Subject, quads: Quad[]}[] = []
    const quads: Quad[] = store.getQuads(subject, predicate, null, null)
    for (let q of quads) {
        let resultQuads: Quad[] = [q]
        if (q.object.termType !== "Literal") {
            resultQuads.concat(extractSubTree(store, q.object))
        } else {
            throw new Error(`Rule predicate ${predicate} has a literal value`)
        }
        results.push({id: q.object, quads: resultQuads})
    }
    return results
}

function replaceQuadSubjects(quads: Quad[], oldSubject: Quad_Subject, newSubject: Quad_Subject) {
    return quads.map(q => {
        if (q.subject.value === oldSubject.value) {
            return quad(newSubject, q.predicate, q.object, q.graph)
        } else {
            return q
        }
    })
}

export function extractSubTree(store: Store, root: Quad_Subject, predicatesToSkip?: string[]): Quad[] {
    let quads: Quad[] = []
    for (let quad of store.getQuads(root, null, null, null)) {
        if (predicatesToSkip && predicatesToSkip.includes(quad.predicate.value)) continue
        quads.push(quad)
        // We cannot iterate over literals
        if(quad.object.termType === "Literal") continue;
        // We should not dereference further in constrants
        if( [
            ODRL.leftOperand as string,
            ODRL.operator as string,
            ODRL.rightOperand as string,
        ].includes(quad.predicate.value)) continue;
        // Execute recursive extraction
        quads = quads.concat(extractSubTree(store, quad.object))
    }
    return quads;
}
