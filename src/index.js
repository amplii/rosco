import {Map, List} from 'immutable';
import ExtendableError from './ExtendableError';

const defaultOptions = Map({
  idAtribute: "id"
});

const DEFAULT_ID = -1;

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

function invalidIDChange(newData){
  const idAtribute = this._options.get('idAtribute');
  const existingId = this.get(idAtribute);
  if (existingId === DEFAULT_ID) { return; }
  const newId = newData[idAtribute];
  if (!newId){return;}
  return existingId !== newId;
}

function callCallbacks(callbacks, args=[]){
  // console.log("callCallbacks", args)
  const callArgs = [this].concat(args);
  callbacks.forEach( callback => {
    callback.apply(this, callArgs);
  });
}

function isIdSet(oldRecordData){
  const idAtribute = this._options.get('idAtribute');
  return oldRecordData.get(idAtribute) === DEFAULT_ID && this.get(idAtribute) !== DEFAULT_ID;
}

function handleNewId(oldRecord){
  // console.log("handleNewId", oldRecord)
  const callbacks = this._events.get('onIdSet');
  this._events.set('onIdSet', List([]));
  callCallbacks.call(this, callbacks, [oldRecord]);
}

function handleCanBeCreated(){
  const callbacks = this._events.get('onCanBeCreated');
  this._events.set('onCanBeCreated', List([]));
  callCallbacks.call(this, callbacks);
}

function relationshipJustReceivedId(recentlySavedInstance, oldInstance){
  // console.log("CHECKING", {recentlySavedInstance, oldInstance})
  const relationshipKey = this._data.keyOf(oldInstance);
  // console.log("FOUND", relationshipKey)
  this._data = this._data.set(relationshipKey, recentlySavedInstance);
  if (!this.canBeCreated()) { return; }
  handleCanBeCreated.call(this);
}

function addNewUnsavedRelationCallback(oldData){
  this._relations.forEach( relation => {
    const oldRelationshipInstance = oldData.get(relation.association);
    if (oldRelationshipInstance) { return; }

    const newRelationshipInstance = this.get(relation.association);
    if (!newRelationshipInstance) { return; }
    // console.log("HELLO NEW ASSOCIATION", newRelationshipInstance)
    if (!newRelationshipInstance.isNewRecord()){ return; }

    newRelationshipInstance.onIdSet(this._relationshipJustReceivedId);
  });
}

function processNewData(oldData){
  addNewUnsavedRelationCallback.call(this, oldData);
}

function removeOldAssociationCallbacks(){
  this._relations.forEach( relation => {
    const newRelationshipInstance = this.get(relation.association);
    if (!newRelationshipInstance) { return; }
    newRelationshipInstance.clearOnIdSet(this._relationshipJustReceivedId);
  });
}

class Model {
  constructor({schema, relations=[], options={}, data={}, events}) {
    this._schema = Map(schema);
    this._relations = List(relations);
    this._events = events || Map({
      onIdSet: List([]),
      onCanBeCreated: List([])
    });

    this._options = defaultOptions.merge(options);
    const idAtribute = this._options.get('idAtribute');
    const defaultData = Map({[idAtribute]: DEFAULT_ID});
    // console.log("HELLOOOO", schema, data)
    this._data = defaultData.merge(data);
    this._relationshipJustReceivedId = relationshipJustReceivedId.bind(this)
    processNewData.call(this, defaultData);
  }

  merge(newData) {
    if (invalidIDChange.call(this, newData)){
      throw new IdChangedError("cannot change id attribute");
    }
    const newRecordData = this._data.merge(newData);
    // console.log("OLD DATA", this._data)
    // console.log("NEW DATA", newRecordData)
    if (newRecordData === this._data){ return this; }
    const SubClass = this.constructor;
    const newSubclassParams = {
      schema: this._schema,
      relations: this._relations,
      data: newRecordData,
      options: this._options,
      events: this._events
    };
    // console.log("Setting new data returning new model", newRecordData);
    const record = new SubClass(newSubclassParams);
    removeOldAssociationCallbacks.call(this)
    if (isIdSet.call(record, this._data)){
      const self = this;
      setTimeout(function(){
        handleNewId.call(record, self);
      });
    }
    return record;
  }

  get(key) {
    return this._data.get(key);
  }

  getData() {
    return this._data;
  }

  isNewRecord(){
    return this.get(this._options.get('idAtribute')) === DEFAULT_ID;
  }

  onIdSet (callback) {
    if (!this.isNewRecord()){
      throw new IdAlreadySetError("cannot call onIdSet, id has already been set");
    }
    const newOnIdSet = this._events.get('onIdSet').push(callback);
    this._events = this._events.set('onIdSet', newOnIdSet);
  }

  clearOnIdSet (callback) {
    const onIdSet = this._events.get('onIdSet');
    const index = onIdSet.indexOf(callback);
    if (index === -1) { return; }
    const newOnIdSet = onIdSet.delete(index);
    this._events = this._events.set('onIdSet', newOnIdSet);
  }

  onCanBeCreated (callback) {
    if (!this.isNewRecord()){
      throw new IdAlreadySetError("cannot call onCanBeCreated, id has already been set");
    }
    if (this.canBeCreated()){
      throw new AlreadyCanBeCreatedError("cannot add callback when record can already be saved");
    }

    const newOnCanBeCreated = this._events.get('onCanBeCreated').push(callback);
    this._events = this._events.set('onCanBeCreated', newOnCanBeCreated);
  }

  canBeCreated(){
    return this._relations.every( relation => {
      const relationshipInstance = this.get(relation.association);
      if (!relationshipInstance) { return true; }
      return !relationshipInstance.isNewRecord();
    });
  }

  isChanged(oldData){
    return oldData !== this._data;
  }

  toJS (){
    const result = this._data.toJS();
    const idAtribute = this._options.get('idAtribute');
    if (result[idAtribute] == DEFAULT_ID) { delete result[idAtribute]; }
    this._relations.forEach( relation => {
      delete result[relation.association];
    });
    return result;
  }
}

Model.STRING = "A STRING";
Model.INTEGER = "AN INTEGER";

export default Model;
