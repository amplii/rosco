import Model from '../../src/index';

export class User extends Model{
  constructor(data={}){
    const schema = {
      id: Model.INTEGER,
      name: Model.STRING
    };
    super({schema, data});
  }
}

export class Image extends Model{
  constructor(data={}){
    const schema = {
      id: Model.INTEGER,
      url: Model.STRING
    };
    super({schema, data});
  }
}

export class ProfileImage extends Model{
  constructor(data={}){
    const schema = {
      id: Model.INTEGER,
      imageId: Model.INTEGER,
      userId: Model.INTEGER,
      name: Model.STRING
    };
    const relations = [
      {model: User, association: 'User'},
      {model: Image, association: 'Image'}
    ];
    super({schema, relations, data});
  }
}
