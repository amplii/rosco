import Model, {IdChangedError} from '../src/index';
import {expect} from 'chai';

describe('Model', function(){

  class User extends Model{
    constructor(data={}){
      const schema = {
        id: Model.INTEGER,
        name: Model.STRING
      };
      super({schema, data});
    }
  }

  class ProfileImage extends Model{
    constructor(data={}){
      const schema = {
        imageUrl: Model.STRING
      };
      const relations = [
        {
          model: User,
          // attribute: 'userId'
          association: 'User'
        }
      ];
      super({schema, relations, data});
    }
  }

  beforeEach(function(){
    this.subject = new User();
  });

  it("can create a model", function(){
    expect(this.subject).to.be.instanceof(User);
    expect(this.subject).to.be.instanceof(Model);
  });

  describe('#isNewRecord', function(){
    it('defaults to an unsaved record', function(){
      const user = new User();
      expect(user.isNewRecord()).to.be.true
    });

    it('is not a new record when given an id from the beginning', function(){
      const user = new User({id: 123});
      expect(user.isNewRecord()).to.be.false
    });

    it('is not a new record an id is set', function(){
      const user = new User();
      user.merge({id: 123})
      expect(user.isNewRecord()).to.be.false
    });

    it("can only mutate the id once", function(){
      const subject = this.subject;
      subject.merge({id: 123});
      expect(function(){
        subject.merge({id: 456});
      }).to.throw(IdChangedError);
      subject.merge({id: 123});
    });
  });

  describe('relations', function(){
    it('can be saved when there are no relations', function(){
      const profileImage = new ProfileImage();
      expect(profileImage.canBeSaved()).to.be.true
    });
    it('can be saved when the relation starts with an id', function(){
      const user = new User({id: 865});
      const profileImage = new ProfileImage({User: user});
      expect(profileImage.canBeSaved()).to.be.true
    });
    it('returns false if the relation does not have an id', function(){
      const user = new User
      const profileImage = new ProfileImage({User: user});
      expect(profileImage.canBeSaved()).to.be.false
    });
    it('can be saved when the relation gets an id', function(){
      const user = new User
      const profileImage = new ProfileImage({User: user});
      expect(profileImage.canBeSaved()).to.be.false
      user.merge({id: 973})
      expect(profileImage.canBeSaved()).to.be.true
    });
  });

  describe("#get and #merge", function(){
    it("can get and set a value", function(){
      this.subject.merge({name: 'Piggy'});
      const value = this.subject.get('name');
      expect(value).to.equal('Piggy');
    });

    it("knows when the data has changed", function(){
      const data1 = this.subject.getData();
      this.subject.merge({name: 'Piggy'});
      expect(this.subject.isChanged(data1)).to.be.true;
      const data2 = this.subject.getData();
      this.subject.merge({name: 'Piggy'});
      expect(this.subject.isChanged(data2)).to.be.false;
    });

  });
});
