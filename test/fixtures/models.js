import Model from '../../src/index';

export class User extends Model{
  constructor(options={}){
    options.schema = {
      id: Model.INTEGER,
      name: Model.STRING
    };
    super(options);
  }
}

export class Image extends Model{
  constructor(options={}){
    options.schema = {
      id: Model.INTEGER,
      url: Model.STRING
    };
    super(options);
  }
}

export class ProfileImage extends Model{
  constructor(options={}){
    options.schema = {
      id: Model.INTEGER,
      imageId: Model.INTEGER,
      userId: Model.INTEGER,
      name: Model.STRING
    };

    options.relations = [
      {model: User, association: 'User'},
      {model: Image, association: 'Image'}
    ];
    super(options);
  }
}
