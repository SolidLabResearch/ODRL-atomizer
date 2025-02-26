# ODRL Atomizer

This nodeJS library can be used to atomize ODRL Policies (Set, Offer, Agreement, Request)
according to the [Rule Composition](https://www.w3.org/TR/odrl-model/#composition)
defined it the ODRL Specification.

## Installation 
(I will add the package to npm later)

```bash
git clone git@github.com:SolidLabResearch/ODRL-atomizer.git
cd atomizer
npm install
```

## Usage

Import the atomizer from the installed location

```
    import { PolicyAtomizer } from "./install/location"
```

The atomizer follows the builder pattern,
consisting of 2 loading functions, 
an atomization function 
and 4 extraction functions.

```js
// Creating the builder
// Use await as the extraction functions are async
await new PolicyAtomizer()
    // Load the policies as quads
    .loadQuads(quads)
    // or as an RDF document
    .loadRDF(rdfString, rdfStringContentType)
    // load can be called multiple times,
    // but must be called BEFORE atomizing

    // then atomize the policies
    .atomize()

    // then the data can be extracted 
    // as the atomized policies of the form {id: policyId, quads: policyQuads}[]
    .getPolicies()
    // as the atomized policies as individual framed JSONLD Objects
    .getFramedPolicies(frame?: Frame)
    // as the atomized rules of all policies of the form {id: ruleId, quads: ruleQuads}[]
    .getRules() 
    // as the atomized rules as individual framed JSONLD Objects
    .getFramedRules(frame?: Frame) {
    
```

## Example

```js
import { readFileSync } from "fs"
import { PolicyAtomizer } from ".";
const policy = readFileSync('./test/data.jsonld', { encoding: 'utf-8' })
const framedPolicies = await new PolicyAtomizer()
                        .loadRDF(policy, "application/ld+json")
                        .atomize()
                        .getFramedPolicies();
console.log(framedPolicies)
```