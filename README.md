# Rosco

The goal of this project is to provide a framework that allows models to be created/updated in the client while having the persistance layer automatically handled behind the scenes. I'm developing this with React in mind. I'm trying to incorporate best practices of immutable state while creating models that will understand when they can be created.

The main problem is outlined in this:

An application has three models: `Message`, `Recipient`, and `Contact`. Let's say that a user wants to create a new email by typing an email address in the `To:` field. With just an email address, we should be able to create a draft message, a new contact, and a recipient (which is just the habtm of a contact to a message). I can send this all in one http request (say `POST /api/message {contactEmail: 'email@example.com'}` and I get back `{message: {id: 1, …}, contact: {id: 2, …}, recipient: {id: 3, …}}`). Here's the problem. Maybe, I want to change the contact email, say I made a mistake, or I want to update the message body. What if I want to add another recipient to that same message before I get a response back from the server. I cannot issue `PUT /api/message {id: 1, body: 'body'}` to the server without sending an id. But I don't have an id. I want to be able to change content in the client and assume it's going to be a success. If the create or update is actually a server failure, then I'll handle that. But better to assume it's going to be a success for the majority of cases. I'm calling the issue optimistic create.

Rosco attempts to solve this problem by allowing you to define models that have relationships and wait for a model to be saved to continue with a create or an update.

## Usage

### Setup

Define models using es6 classes. All examples will assume these models.

```js
import Model from 'rosco';

class User extends Model {
  constructor(data={}) {
    const schema = {
      id: Model.INTEGER,
      email: Model.STRING
    };
    super({schema, data});
  }
}


class Profile extends Model {
  constructor(data={}) {
    const schema = {
      id: Model.INTEGER,
      userId: Model.INTEGER,
      name: Model.STRING
    };
    const relations = [
      {model: User, association: 'User'},
    ];
    super({schema, relations, data});
  }
}
```

### Methods

#### Initialization

```js
const user = new User({email: 'ada@lovelace.com'});
const profile = new Profile({User: user});
```

#### Getting / Setting data

```js
const user = new User({email: 'Ada Lovelace'});
const email = user.get('email');
const oldData = user.getData();
user.merge({email: 'countess@lovelace.com'});
user.isChanged(oldData); // => true

const oldData2 = user.getData();
user.merge({email: 'countess@lovelace.com'});
user.isChanged(oldData); // => false
```

```js
const user = new User({email: 'ada@lovelace.com'});
const profile = new Profile({User: user, name: 'Ada Lovelace'});
profile.toJS() // => {name: 'Ada Lovelace'}
```

#### Waiting for association creation

```js
const user = new User({email: 'ada@lovelace.com'});
const profile = new Profile({User: user});
user.canBeCreated(); // => true
profile.canBeCreated(); // => false (would be true if there was no user record in data)
console.log("log 1");
profile.onCanBeCreated(function(){
  // this === profile
  console.log("log 3");
});
console.log("log 2");
user.merge({id: 1});
console.log("log 4");
```

### Todo

* I want the models to automatically convert date strings to dates, etc. This is the motivation for the schema that I am not doing anything with.
* I want models to have understand the difference between the persistance layer data vs what is in memory.
* I want models to understand more complex relations (perhaps required associations vs not).
* I want models to infer association field (aka pass User in data, fills in userId).
* I want models to have validations. Do I really want this? Is this feature creep?
