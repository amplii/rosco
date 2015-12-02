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

function callCallbacks(callbacks){
  callbacks.forEach( callback => {
    callback.call(this, this);
  });
}

function isIdSet(oldData){
  const idAtribute = this._options.get('idAtribute');
  return oldData.get(idAtribute) === DEFAULT_ID && this.get(idAtribute) !== DEFAULT_ID;
}

function handleNewId(){
  const callbacks = this._events.get('onIdSet');
  this._events.set('onIdSet', List([]));
  callCallbacks.call(this, callbacks);
}

function handleCanBeCreated(){
  const callbacks = this._events.get('onCanBeCreated');
  this._events.set('onCanBeCreated', List([]));
  callCallbacks.call(this, callbacks);
}

function checkOnCanBeCreated(recentlySavedInstance){
  if (!this.canBeCreated()) { return; }
  handleCanBeCreated.call(this);
}

function addNewUnsavedRelationCallback(oldData){
  this._relations.forEach( relation => {
    const oldRelationshipInstance = oldData.get(relation.association);
    if (oldRelationshipInstance) { return; }

    const newRelationshipInstance = this.get(relation.association);
    if (!newRelationshipInstance) { return; }
    if (!newRelationshipInstance.isNewRecord()){ return; }

    newRelationshipInstance.onIdSet(checkOnCanBeCreated.bind(this));
  });
}

function processNewData(oldData){
  addNewUnsavedRelationCallback.call(this, oldData);
}

class Model {
  constructor({schema, relations=[], options={}, data={}}) {
    this._schema = Map(schema);
    this._relations = List(relations);
    this._events = Map({
      onIdSet: List([]),
      onCanBeCreated: List([])
    });

    this._options = defaultOptions.merge(options);
    const idAtribute = this._options.get('idAtribute');
    const defaultData = Map({[idAtribute]: DEFAULT_ID});

    this._data = defaultData.merge(data);
    processNewData.call(this, defaultData);
  }

  merge(newData) {
    if (invalidIDChange.call(this, newData)){
      throw new IdChangedError("cannot change id attribute");
    }
    const oldData = this._data;
    this._data = this._data.merge(newData);
    processNewData.call(this, oldData);
    if (isIdSet.call(this, oldData)){
      handleNewId.call(this);
    }
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
    let result = this._data.toJS();
    const idAtribute = this._options.get('idAtribute')
    if (result[idAtribute] == DEFAULT_ID) { delete result[idAtribute]; }
    this._relations.forEach( relation => {
      delete result[relation.association];
    });
    return result
  }
}

Model.STRING = "A STRING";
Model.INTEGER = "AN INTEGER";

export default Model;
