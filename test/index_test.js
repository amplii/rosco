import Model, { IdChangedError, IdAlreadySetError } from '../src/index';
import { expect } from 'chai';
import { User, Image, ProfileImage } from './fixtures/models';

describe('Model', function () {
  beforeEach(function () {
    this.subject = new User();
  });

  it('can create a model', function () {
    expect(this.subject).to.be.instanceof(User);
    expect(this.subject).to.be.instanceof(Model);
  });

  describe('#isNewRecord', function () {
    it('defaults to an unsaved record', function () {
      const user = new User();
      expect(user.isNewRecord()).to.be.true;
    });

    it('is not a new record when given an id from the beginning', function () {
      const user = new User({ data: { id: 123 } });
      expect(user.isNewRecord()).to.be.false;
    });

    it('is not a new record an id is set', function () {
      const user = new User();
      const newUser = user.merge({ id: 123 });
      expect(newUser.isNewRecord()).to.be.false;
    });

    it('can only mutate the id once', function () {
      const subject = this.subject;
      let newUser = subject.merge({ id: 123 });
      expect(function () {
        newUser.merge({ id: 456 });
      }).to.throw(IdChangedError);
      newUser = newUser.merge({ id: 123 });
    });
  });

  describe('#onIdSet', function () {
    it('will call a callback when the id is set', function (done) {
      const user = new User();
      user.onIdSet(function () {
        expect(this).to.be.ok;
        expect(this.id()).to.equal(123);
        expect(user.id()).not.to.equal(123);
        expect(this).not.to.equal(user);
        done();
      });
      user.merge({ id: 123 });
    });

    it('will throw an error when adding a callback and the user already has an error', function () {
      const user = new User();
      const newUser = user.merge({ id: 123 });
      expect(function () {
        newUser.onIdSet(function () {});
      }).to.throw(IdAlreadySetError);
    });
  });

  describe('#onIdSetOrNow', function () {
    it('will call a callback when the id is set', function (done) {
      const user = new User();
      user.onIdSetOrNow(function () {
        expect(this).to.be.ok;
        expect(this.id()).to.equal(123);
        expect(user.id()).not.to.equal(123);
        expect(this).not.to.equal(user);
        done();
      });
      user.merge({ id: 123 });
    });

    it('will call immediatly when the user already has an id', function (done) {
      const user = new User({ data: { id: 123 } });
      user.onIdSetOrNow(function (thisUser) {
        expect(this).to.equal(user);
        expect(user).to.equal(thisUser);
        done();
      });
    });
  });

  context('relations', function () {
    it('can be saved when there are no relations', function () {
      const profileImage = new ProfileImage();
      expect(profileImage.canBeCreated()).to.be.true;
    });

    it('can be saved when the relation starts with an id', function () {
      const user = new User({ data: { id: 865 } });
      const profileImage = new ProfileImage({ data: { User: user } });
      expect(profileImage.canBeCreated()).to.be.true;
    });

    it('extracts the id from the relation', function () {
      const user = new User({ data: { id: 865 } });
      const profileImage = new ProfileImage({ data: { User: user } });
      expect(profileImage.get('userId')).to.equal(865);
    });

    it('returns false if the relation does not have an id', function () {
      const user = new User();
      const profileImage = new ProfileImage({ data: { User: user } });
      expect(profileImage.canBeCreated()).to.be.false;
    });

    it('can be saved when the relation gets an id', function (done) {
      const user = new User();
      const profileImage = new ProfileImage({ data: { User: user } });
      expect(profileImage.canBeCreated()).to.be.false;

      user.onIdSet(function (newUserRecord, oldUserRecord) {
        expect(this === newUserRecord).to.be.true;
        expect(newUserRecord.isNewRecord()).to.be.false;
        expect(oldUserRecord.isNewRecord()).to.be.true;
        expect(profileImage.canBeCreated()).to.be.true;
        expect(profileImage.get('userId')).to.equal(973);
        done();
      });
      user.merge({ id: 973 });
    });
  });

  describe('#onCanBeCreated', function () {
    it('emits an event when the relation can now be saved', function (done) {
      const user = new User();
      const profileImage = new ProfileImage({ data: { User: user } });

      profileImage.onCanBeCreated(function (newProfileImage) {
        expect(this).to.equal(profileImage);
        expect(newProfileImage).to.equal(profileImage);
        done();
      });

      user.merge({ id: 973 });
    });

    it('passes in any new profile images and clears new records', function (done) {
      const user = new User();
      const profileImage = new ProfileImage({ data: { User: user } });
      let callCount = 0;
      let newProfileImage1 = null;
      let newProfileImage2 = null;
      profileImage.onCanBeCreated(function (newProfileImage) {
        expect(newProfileImage).not.to.equal(profileImage);
        expect(profileImage.canBeCreated()).to.be.false;
        expect(newProfileImage.canBeCreated()).to.be.true;

        callCount += 1;
        if (callCount === 1) {
          expect(newProfileImage.get('name')).to.equal('new profileImageName');
          expect(this).to.equal(newProfileImage1);
        }
        if (callCount === 2) {
          expect(newProfileImage.get('name')).to.equal('new profileImageName2');
          expect(this).to.equal(newProfileImage2);
          done();
        }
      });

      newProfileImage1 = profileImage.merge({ name: 'new profileImageName' });
      newProfileImage2 = profileImage.merge({ name: 'new profileImageName2' });

      user.merge({ id: 973 });
    });

    it('emits an event when the relation can now be saved with two relations', function (done) {
      const user = new User();
      const image = new Image();
      const profileImage = new ProfileImage({ data: { User: user, Image: image } });

      profileImage.onCanBeCreated(function () {
        done();
      });

      user.merge({ id: 973 });
      image.merge({ id: 565 });
    });

    it('removes the actual relation object and just keeps the id when the id is set', function () {
      const user = new User();
      const image = new Image();
      const profileImage = new ProfileImage({ data: { User: user, Image: image } });

      expect(profileImage.get('User')).to.equal(user);
      expect(profileImage.get('userId')).to.equal(user.id());
      const user2 = user.merge({ id: 973 });
      expect(profileImage.get('User')).to.be.undefined;
      expect(profileImage.get('userId')).to.equal(user2.id());
      expect(profileImage.get('userId')).not.to.equal(user.id());
    });

    it('does not throw an error when the profile can be created and a callback is set', function (done) {
      const profileImage = new ProfileImage({});
      profileImage.onCanBeCreated(function (profile2) {
        expect(profile2).to.equal(profileImage);
        done();
      });
    });

    it('throws an error when the profile already has an id and a callback is set', function () {
      const profileImage = new ProfileImage({ data: { id: 123 } });

      expect(function () {
        profileImage.onCanBeCreated(function () {});
      }).to.throw(IdAlreadySetError);
    });
  });

  describe('#get and #merge', function () {
    it('can get and set a value', function () {
      const newRecord = this.subject.merge({ name: 'Piggy' });
      expect(newRecord.get('name')).to.equal('Piggy');
    });

    it('will not overwrite the old model', function () {
      this.subject.merge({ name: 'Piggy' });
      expect(this.subject.get('name')).to.be.undefined;
    });

    it('will not overwrite the old options', function () {
      const user = new User({ data: { id: 123 }, options: { isTempId: true } });
      const newUserRecord = user.merge({ name: 'Piggy' });
      expect(newUserRecord._options.get('isTempId')).to.be.true;
    });

    it('knows when the data has changed', function () {
      const newUserRecord = this.subject.merge({ name: 'Piggy' });
      expect(this.subject === newUserRecord).to.be.false;
      const newNewUserRecord = newUserRecord.merge({ name: 'Piggy' });
      expect(newUserRecord === newNewUserRecord).to.be.true;
    });
  });

  describe('#createNeedsToBeCalled', function () {
    it('sets createCalled', function () {
      this.subject.createCalled();
      expect(this.subject.isCreateCalled()).to.be.true;
    });
    it('passes on with merge calls', function () {
      this.subject.createCalled();
      const instance2 = this.subject.merge({ field1: 'value 2' });
      expect(instance2.isCreateCalled()).to.be.true;
    });
    it('returns true when create has not been called and the instance is new', function () {
      expect(this.subject.createNeedsToBeCalled()).to.be.true;
    });
    it('returns false when the instance is not new', function () {
      const user = this.subject.merge({ id: 123 });
      expect(user.createNeedsToBeCalled()).to.be.false;
    });
    it('returns false when the create has been called', function () {
      this.subject.createCalled();
      expect(this.subject.createNeedsToBeCalled()).to.be.false;
    });
  });

  describe('#id', function () {
    it('returns a negative value for a new record', function () {
      expect(this.subject.id()).to.be.lt(0);
    });

    it('returns the value when set', function () {
      const newUser = this.subject.merge({ id: 123 });
      expect(newUser.id()).to.equal(123);
    });

    it('can take an unsaved flag for the id', function () {
      const user = new User({ data: { id: 123 }, options: { isTempId: true } });
      expect(user.id()).to.equal(123);
      expect(user.isNewRecord()).to.be.true;
    });

    it('can update an unsaved id', function () {
      const user = new User({ data: { id: 123 }, options: { isTempId: true } });
      const newUser = user.merge({ id: 321 }, { isTempId: false });
      expect(newUser.isNewRecord()).to.be.false;
    });
  });

  describe('#toJS', function () {
    it('returns json', function () {
      const newRecord = this.subject.merge({ id: 123, name: 'Piggy' });
      expect(newRecord.toJS()).to.deep.equal({ id: 123, name: 'Piggy' });
    });

    it('does not return an id when one is not set', function () {
      const newRecord = this.subject.merge({ name: 'Piggy' });
      expect(newRecord.toJS()).to.deep.equal({ name: 'Piggy', clientId: newRecord.id() });
    });

    it('returns the temp id for a clientId when a temp id is set', function () {
      const user = new User({ data: { name: 'Ada', id: 123 }, options: { isTempId: true } });
      expect(user.toJS()).to.deep.equal({ name: 'Ada', clientId: 123 });
    });

    it('does not return the relations when unsaved', function () {
      const profileImage = new ProfileImage({ data: { User: this.subject, name: 'Fun picture' } });
      expect(this.subject.id()).to.be.ok;
      expect(profileImage.toJS()).to.deep.equal({ name: 'Fun picture', clientId: profileImage.id() });
    });

    it('does return the relations when saved', function () {
      const newUser = this.subject.merge({ id: 123 });
      const profileImage = new ProfileImage({ data: { User: newUser, name: 'Fun picture' } });
      expect(profileImage.toJS()).to.deep.equal({ name: 'Fun picture', userId: 123, clientId: profileImage.id() });
    });
  });
});
