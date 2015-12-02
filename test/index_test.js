import Model, {IdChangedError, IdAlreadySetError, AlreadyCanBeCreatedError} from '../src/index';
import {expect} from 'chai';
import {User, Image, ProfileImage} from './fixtures/models'

describe('Model', function(){

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
      expect(user.isNewRecord()).to.be.true;
    });

    it('is not a new record when given an id from the beginning', function(){
      const user = new User({id: 123});
      expect(user.isNewRecord()).to.be.false;
    });

    it('is not a new record an id is set', function(){
      const user = new User();
      user.merge({id: 123});
      expect(user.isNewRecord()).to.be.false;
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

  describe('#onIdSet', function(){
    it('will call a callback when the id is set', function(done){
      const user = new User();
      user.onIdSet(function(){
        expect(this).to.equal(user);
        done();
      });
      user.merge({id: 123});
    });

    it('will throw an error when adding a callback and the user already has an error', function(){
      const user = new User();
      user.merge({id: 123});
      expect(function(){
        user.onIdSet(function(){});
      }).to.throw(IdAlreadySetError);
    });
  });

  context('relations', function(){
    it('can be saved when there are no relations', function(){
      const profileImage = new ProfileImage();
      expect(profileImage.canBeCreated()).to.be.true;
    });
    it('can be saved when the relation starts with an id', function(){
      const user = new User({id: 865});
      const profileImage = new ProfileImage({User: user});
      expect(profileImage.canBeCreated()).to.be.true;
    });
    it('returns false if the relation does not have an id', function(){
      const user = new User;
      const profileImage = new ProfileImage({User: user});
      expect(profileImage.canBeCreated()).to.be.false;
    });
    it('can be saved when the relation gets an id', function(){
      const user = new User;
      const profileImage = new ProfileImage({User: user});
      expect(profileImage.canBeCreated()).to.be.false;
      user.merge({id: 973});
      expect(profileImage.canBeCreated()).to.be.true;
    });
  });

  describe('#onCanBeCreated', function(){
    it('emits an event when the relation can now be saved', function(done){
      const user = new User;
      const profileImage = new ProfileImage({User: user});

      profileImage.onCanBeCreated(function(){
        expect(this).to.equal(profileImage);
        done();
      });

      user.merge({id: 973});
    });

    it('emits an event when the relation can now be saved with two relations', function(done){
      const user = new User;
      const image = new Image;
      const profileImage = new ProfileImage({User: user, Image: image});

      profileImage.onCanBeCreated(function(){
        done();
      });

      user.merge({id: 973});
      image.merge({id: 565});
    });

    it('throws an error when the profile can be created and a callback is set', function(){
      const profileImage = new ProfileImage({});

      expect(function(){
        profileImage.onCanBeCreated(function(){});
      }).to.throw(AlreadyCanBeCreatedError);

    });

    it('throws an error when the profile already has an id and a callback is set', function(){
      const profileImage = new ProfileImage({id: 123});

      expect(function(){
        profileImage.onCanBeCreated(function(){});
      }).to.throw(IdAlreadySetError);
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

  describe("#toJS", function(){
    it("returns json", function(){
      this.subject.merge({id: 123, name: 'Piggy'});
      const value = this.subject.toJS()
      expect(value).to.deep.equal({id: 123, name: 'Piggy'});
    });

    it("does not return an id when one is not set", function(){
      this.subject.merge({name: 'Piggy'});
      const value = this.subject.toJS()
      expect(value).to.deep.equal({name: 'Piggy'});
    });

    it("does not return the relations", function(){
      const profileImage = new ProfileImage({User: this.subject, name: "Fun picture"});

      const value = profileImage.toJS()
      expect(value).to.deep.equal({name: 'Fun picture'});
    });
  })
});
