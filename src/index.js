import { Map, List } from 'immutable';
import ExtendableError from './ExtendableError';

const defaultOptions = new Map({
  idAtribute: 'id',
  isTempId: false,
});

let CURRENT_UNKNOWN_ID = -1;

class IdChangedError extends ExtendableError {
  constructor(m) {
    super(m);
  }
}

class IdAlreadySetError extends ExtendableError {
  constructor(m) {
    super(m);
  }
}

class AlreadyCanBeCreatedError extends ExtendableError {
  constructor(m) {
    super(m);
  }
}

function createUnsavedId() {
  CURRENT_UNKNOWN_ID -= 1;
  return CURRENT_UNKNOWN_ID;
}

function isUnsavedId(id) {
  return id < 0;
}

function isSavedId(id) {
  return id && !isUnsavedId(id);
}

function invalidIDChange(newData) {
  const idAtribute = this._options.get('idAtribute');
  if (this.isNewRecord()) { return false; }
  const newId = newData[idAtribute];
  if (!newId) { return false; }

  const existingId = this.get(idAtribute);
  return existingId !== newId;
}

function callCallbacks(callbacks, args = []) {
  const callArgs = [this].concat(args);
  callbacks.forEach(callback => {
    callback.apply(this, callArgs);
  });
}

function isIdSet(oldRecord) {
  return oldRecord.isNewRecord() && !this.isNewRecord();
}

function handleNewId(oldRecord) {
  const callbacks = this._events.get('onIdSet');
  this._events.set('onIdSet', new List([]));
  callCallbacks.call(this, callbacks, [oldRecord]);
}

function handleCanBeCreated() {
  const callbacks = this._events.get('onCanBeCreated');
  this._events.set('onCanBeCreated', new List([]));
  callCallbacks.call(this, callbacks);
}

function overwriteAssociationAttributeWithAssocitionId(associationDefintion) {
  const associationName = associationDefintion.association;
  const associationAttribute = associationDefintion.attribute;
  // return if associationAttribute already set
  const associationId = this._data.get(associationAttribute);
  if (isSavedId(associationId)) {
    return;
  }

  // return if no association
  const association = this._data.get(associationName);
  if (!association) { return; }
  this._data = this._data.set(associationAttribute, association.id());
}

function relationshipJustReceivedId(recentlySavedInstance, oldInstance, relation) {
  const relationshipKey = this._data.keyOf(oldInstance);
  this._data = this._data.set(relationshipKey, recentlySavedInstance);
  overwriteAssociationAttributeWithAssocitionId.call(this, relation);
  if (!this.canBeCreated()) { return; }
  handleCanBeCreated.call(this);
}

function addNewUnsavedRelationCallback(oldData) {
  this._relations = this._relations.map(relation => {
    const oldRelationshipInstance = oldData.get(relation.association);
    if (oldRelationshipInstance) { return relation; }

    const newRelationshipInstance = this.get(relation.association);
    if (!newRelationshipInstance) { return relation; }
    if (!newRelationshipInstance.isNewRecord()) { return relation; }

    const relationOnIdSet = (recentlySavedInstance, oldInstance) => {
      relationshipJustReceivedId.call(this, recentlySavedInstance, oldInstance, relation);
    };
    relation.onIdSetCallback = relationOnIdSet;

    newRelationshipInstance.onIdSet(relationOnIdSet);
    return relation;
  });
}

function processNewData(oldData) {
  addNewUnsavedRelationCallback.call(this, oldData);
}

function removeOldAssociationCallbacks() {
  this._relations.forEach(relation => {
    const newRelationshipInstance = this.get(relation.association);
    if (!newRelationshipInstance) { return; }
    newRelationshipInstance.clearOnIdSet(relation.onIdSetCallback);
  });
}

function populateRelationData() {
  this._relations.forEach(overwriteAssociationAttributeWithAssocitionId.bind(this));
}

class Model {
  constructor({ schema, relations = [], options = {}, data = {}, events }) {
    this._schema = new Map(schema);
    this._relations = new List(relations);
    this._events = events || new Map({
      onIdSet: new List([]),
      onCanBeCreated: new List([]),
    });
    this._options = defaultOptions.merge(options);
    const idAtribute = this._options.get('idAtribute');
    const defaultData = new Map({ [idAtribute]: createUnsavedId() });

    this._data = defaultData.merge(data);

    populateRelationData.call(this);
    processNewData.call(this, defaultData);
  }

  merge(newData, options = {}) {
    if (invalidIDChange.call(this, newData)) {
      throw new IdChangedError('cannot change id attribute');
    }
    const newRecordData = this._data.merge(newData);
    if (newRecordData === this._data) { return this; }
    const SubClass = this.constructor;
    const newSubclassParams = {
      schema: this._schema,
      relations: this._relations,
      data: newRecordData,
      options: this._options.merge(options),
      events: this._events,
    };
    const record = new SubClass(newSubclassParams);
    removeOldAssociationCallbacks.call(this);
    if (isIdSet.call(record, this)) {
      const self = this;
      setTimeout(function () {
        handleNewId.call(record, self);
      });
    }
    return record;
  }

  get(key) {
    return this._data.get(key);
  }

  id() {
    return this.get(this._options.get('idAtribute'));
  }

  getData() {
    return this._data;
  }

  isNewRecord() {
    if (this._options.get('isTempId')) { return true; }
    const idAtribute = this._options.get('idAtribute');
    return isUnsavedId(this.get(idAtribute));
  }

  onIdSet(callback) {
    if (!this.isNewRecord()) {
      throw new IdAlreadySetError('cannot call onIdSet, id has already been set');
    }
    const newOnIdSet = this._events.get('onIdSet').push(callback);
    this._events = this._events.set('onIdSet', newOnIdSet);
  }

  onIdSetOrNow(callback) {
    if (this.isNewRecord()) {
      return this.onIdSet(callback);
    }
    // execute now
    return setTimeout(() => {
      callCallbacks.call(this, [callback]);
    });
  }

  clearOnIdSet(callback) {
    const onIdSet = this._events.get('onIdSet');
    const index = onIdSet.indexOf(callback);
    if (index === -1) { return; }
    const newOnIdSet = onIdSet.delete(index);
    this._events = this._events.set('onIdSet', newOnIdSet);
  }

  onCanBeCreated(callback) {
    if (!this.isNewRecord()) {
      throw new IdAlreadySetError('cannot call onCanBeCreated, id has already been set');
    }
    if (this.canBeCreated()) {
      throw new AlreadyCanBeCreatedError('cannot add callback when record can already be saved');
    }

    const newOnCanBeCreated = this._events.get('onCanBeCreated').push(callback);
    this._events = this._events.set('onCanBeCreated', newOnCanBeCreated);
  }

  canBeCreated() {
    return this._relations.every(relation => {
      const relationshipInstance = this.get(relation.association);
      if (!relationshipInstance) { return true; }
      return !relationshipInstance.isNewRecord();
    });
  }

  isChanged(oldData) {
    return oldData !== this._data;
  }

  toJS() {
    const result = this._data.toJS();
    const idAtribute = this._options.get('idAtribute');
    if (this.isNewRecord()) { delete result[idAtribute]; }
    this._relations.forEach(relation => {
      delete result[relation.association];
    });
    return result;
  }
}

Model.STRING = String;
Model.NUMBER = Number;

export default Model;
