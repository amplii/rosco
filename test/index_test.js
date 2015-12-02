import Model, {IdChangedError, IdAlreadySetError, AlreadyCanBeCreatedError} from '../src/index';
import {expect} from 'chai';
import {User, Image, ProfileImage} from './fixtures/models';

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
      const user = new User({data: {id: 123}});
      expect(user.isNewRecord()).to.be.false;
    });

    it('is not a new record an id is set', function(){
      const user = new User();
      const newUser = user.merge({id: 123});
      expect(newUser.isNewRecord()).to.be.false;
    });

    it("can only mutate the id once", function(){
      const subject = this.subject;
      let newUser = subject.merge({id: 123});
      expect(function(){
        newUser.merge({id: 456});
      }).to.throw(IdChangedError);
      newUser = newUser.merge({id: 123});
    });
  });

  describe('#onIdSet', function(){
    it('will call a callback when the id is set', function(done){
      const user = new User();
      user.onIdSet(function(){
        expect(this).to.equal(newUser);
        expect(this).not.to.equal(user);
        done();
      });
      const newUser = user.merge({id: 123});
    });

    it('will throw an error when adding a callback and the user already has an error', function(){
      const user = new User();
      const newUser = user.merge({id: 123});
      expect(function(){
        newUser.onIdSet(function(){});
      }).to.throw(IdAlreadySetError);
    });
  });

  context('relations', function(){
    it('can be saved when there are no relations', function(){
      const profileImage = new ProfileImage();
      expect(profileImage.canBeCreated()).to.be.true;
    });
    it('can be saved when the relation starts with an id', function(){
      const user = new User({data: {id: 865}});
      const profileImage = new ProfileImage({data: {User: user}});
      expect(profileImage.canBeCreated()).to.be.true;
    });

    it('returns false if the relation does not have an id', function(){
      const user = new User;
      const profileImage = new ProfileImage({data: {User: user}});
      expect(profileImage.canBeCreated()).to.be.false;
    });
    it('can be saved when the relation gets an id', function(done){
      const user = new User;
      const profileImage = new ProfileImage({data: {User: user}});
      expect(profileImage.canBeCreated()).to.be.false;

      user.onIdSet(function(newUserRecord, oldUserRecord){
        expect(this === newUserRecord).to.be.true;
        expect(newUser === newUserRecord).to.be.true;
        expect(newUserRecord.isNewRecord()).to.be.false;
        expect(oldUserRecord.isNewRecord()).to.be.true;
        expect(profileImage.canBeCreated()).to.be.true;
        done();
      });
      const newUser = user.merge({id: 973});
    });
  });

  describe('#onCanBeCreated', function(){
    it('emits an event when the relation can now be saved', function(done){
      const user = new User;
      const profileImage = new ProfileImage({data: {User: user}});

      profileImage.onCanBeCreated(function(newProfileImage){
        expect(this).to.equal(profileImage);
        expect(newProfileImage).to.equal(profileImage);
        done();
      });

      user.merge({id: 973});
    });

    it('passes in any new profile images and clears new records', function(done){
      const user = new User;
      const profileImage = new ProfileImage({data: {User: user}});
      let callCount = 0;
      profileImage.onCanBeCreated(function(newProfileImage){
        expect(newProfileImage).not.to.equal(profileImage);
        expect(profileImage.canBeCreated()).to.be.false;
        expect(newProfileImage.canBeCreated()).to.be.true;

        callCount += 1;
        if (callCount === 1){
          expect(newProfileImage.get('name')).to.equal('new profileImageName');
          expect(this).to.equal(newProfileImage1);
        }
        if (callCount === 2){
          expect(newProfileImage.get('name')).to.equal('new profileImageName2');
          expect(this).to.equal(newProfileImage2);
          done();
        }
      });

      const newProfileImage1 = profileImage.merge({name: "new profileImageName"});
      const newProfileImage2 = profileImage.merge({name: "new profileImageName2"});

      user.merge({id: 973});
    });

    it('emits an event when the relation can now be saved with two relations', function(done){
      const user = new User;
      const image = new Image;
      const profileImage = new ProfileImage({data: {User: user, Image: image}});

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
      const profileImage = new ProfileImage({data: {id: 123}});

      expect(function(){
        profileImage.onCanBeCreated(function(){});
      }).to.throw(IdAlreadySetError);
    });
  });

  describe("#get and #merge", function(){
    it("can get and set a value", function(){
      const newRecord = this.subject.merge({name: 'Piggy'});
      expect(newRecord.get('name')).to.equal('Piggy');
    });
    it("will not overwrite the old model", function(){
      this.subject.merge({name: 'Piggy'});
      expect(this.subject.get('name')).to.be.undefined;
    });

    it("knows when the data has changed", function(){
      const newUserRecord = this.subject.merge({name: 'Piggy'});
      expect(this.subject === newUserRecord).to.be.false;
      const newNewUserRecord = newUserRecord.merge({name: 'Piggy'});
      expect(newUserRecord === newNewUserRecord).to.be.true;
    });
  });

  describe("#toJS", function(){
    it("returns json", function(){
      const newRecord = this.subject.merge({id: 123, name: 'Piggy'});
      expect(newRecord.toJS()).to.deep.equal({id: 123, name: 'Piggy'});
    });

    it("does not return an id when one is not set", function(){
      const newRecord = this.subject.merge({name: 'Piggy'});
      expect(newRecord.toJS()).to.deep.equal({name: 'Piggy'});
    });

    it("does not return the relations", function(){
      const profileImage = new ProfileImage({data: {User: this.subject, name: "Fun picture"}});
      expect(profileImage.toJS()).to.deep.equal({name: 'Fun picture'});
    });
  });
});
