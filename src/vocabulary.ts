import { createVocabulary } from 'rdf-vocabulary';

// Creates a vocabulary.
// The first parameter is the namespace, all the following parameters are terms in the namespace.
export const RDF = createVocabulary(
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  'type',
);

export const ODRL = createVocabulary(
    'http://www.w3.org/ns/odrl/2/',
    'Policy',
    'Set',
    'Offer',
    'Agreement',
    'Request',
    'uid',
    'profile',
    'Asset',
    'AssetCollection',
    'target',
    'relation',
    'permission',
    'obligation',
    'prohibition',
    'assigner',
    'assignee',
    'action',
    'leftOperand',
    'operator',
    'rightOperand',
  );


export const EX = createVocabulary(
  'http://example.org/ns/',
  'derivedFrom',
)