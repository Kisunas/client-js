Bayesian Bandit JavaScript Client
=================================

JavaScript client for Bayesian Bandit testing server.

Usage
-----

```js
var cta = document.getElementById('cta');

BayesianBandit.init('http://bayesianbandit.example.org/t/');

BayesianBandit.try('cta', ['red', 'green', 'blue'], function (versionId) {
  cta.classList.add(versionId);
});

cta.addEventListener('click', function (event) {
  event.preventDefault();

  BayesianBandit.win('cta');
});
```

API
---

#### `init(serverUrl)`

Initialize client. Must be called before any other methods.

**Params:**

- `serverUrl : String`

#### `try(testId, versionIds, callback)`

Participate in specific test by receiving a designated version.

**Params:**

- `testId : String`
- `versionIds : String[]`
- `callback : Function` - called with designated `versionId : String`.
 
#### `win(testId)`

Register conversion in specific test.

**Params:**

- `testId : String`
