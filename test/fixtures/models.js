import Model from '../../src/index';

export class User extends Model {
  constructor(options = {}) {
    options.schema = {
      id: Model.NUMBER,
      name: Model.STRING,
    };
    super(options);
  }
}

export class Image extends Model {
  constructor(options = {}) {
    options.schema = {
      id: Model.NUMBER,
      url: Model.STRING,
    };
    super(options);
  }
}

export class ProfileImage extends Model {
  constructor(options = {}) {
    options.schema = {
      id: Model.NUMBER,
      imageId: Model.NUMBER,
      userId: Model.NUMBER,
      name: Model.STRING,
    };

    options.relations = [
      { model: User, association: 'User', attribute: 'userId' },
      { model: Image, association: 'Image' },
    ];
    super(options);
  }
}
