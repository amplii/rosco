import Rosco, {IdChangedError} from '../src/index';
import {expect} from 'chai';

describe('Rosco', function(){

  class User extends Rosco{
    constructor(data={}){
      const schema = {
        id: Rosco.INTEGER,
        name: Rosco.STRING
      };
      super({schema, data});
    }
  }

  class ProfileImage extends Rosco{
    constructor(data={}){
      const schema = {
        imageUrl: Rosco.STRING
      };
      const relations = {
        userId: User
      };
      super({schema, relations, data});
    }
  }

  beforeEach(function(){
    this.subject = new User();
  });

  it("can create a model", function(){
    expect(this.subject).to.be.instanceof(User);
    expect(this.subject).to.be.instanceof(Rosco);
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
