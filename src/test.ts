import { readFileSync } from "fs"
import { PolicyAtomizer } from ".";

async function runTest() {
    const policy = readFileSync('./test/data.jsonld', { encoding: 'utf-8' })
    
    const framedPolicies = await new PolicyAtomizer()
                        .loadRDF(policy, "application/ld+json")
                        .atomize()
                        .getFramedPolicies();

    console.log('Policies')
    console.log('')
    for (let framedPolicy of framedPolicies) console.log(JSON.stringify(framedPolicy, null, 2))

    const framedRules = await new PolicyAtomizer()
                        .loadRDF(policy, "application/ld+json")
                        .atomize()
                        .getFramedRules();
    console.log('')
    console.log('Rules')
    for (let framedRule of framedRules) console.log(JSON.stringify(framedRule, null, 2))

        
}

runTest();


