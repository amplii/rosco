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

function invalidIDChange(newData){
  const idAtribute = this._options.get('idAtribute');
  const existingId = this._data.get(idAtribute);
  if (existingId === DEFAULT_ID){return;}
  const newId = newData[idAtribute];
  if (!newId){return;}
  return existingId !== newId;
}

class Model {
  constructor({schema, relations=[], options={}, data={}}) {
    this._options = defaultOptions.merge(options);
    const idAtribute = this._options.get('idAtribute');
    this._schema = Map(schema);
    this._relations = List(relations);
    const defaultData = Map({[idAtribute]: DEFAULT_ID});
    // console.log("Data", data)
    this._data = defaultData.merge(data);
  }
  merge(newData) {
    if (invalidIDChange.call(this, newData)){
      throw new IdChangedError("cannot change id attribute");
    }
    this._data = this._data.merge(newData);
  }
  get(key) {
    return this._data.get(key);
  }
  getData() {
    return this._data;
  }
  isNewRecord(){
    // console.log(this._data)
    return this._data.get(this._options.get('idAtribute')) === DEFAULT_ID;
  }
  canBeSaved(){
    return this._relations.every( relation => {
      const relationshipInstance = this.get(relation.association);
      // console.log("relation", relationshipInstance)
      if(!relationshipInstance){return true;}
      return !relationshipInstance.isNewRecord();
    });
  }
  isChanged(oldData){
    return oldData !== this._data;
  }
}

Model.STRING = "A STRING";
Model.INTEGER = "AN INTEGER";

export default Model;
