Bayesian Bandit JavaScript Client
=================================

JavaScript client for Bayesian Bandit testing server.


Usage
-----

```js
var buyButton = document.getElementById('buyButton');

BayesianBandit.init('http://bayesianbandit.example.org/t/');

BayesianBandit.try('buy-button-color', ['red', 'green', 'blue'], function (versionId) {
  buyButton.classList.add(versionId);
});

buyButton.addEventListener('click', function (event) {
  event.preventDefault();

  BayesianBandit.win('buy-button-color');
});
```


API
---

#### `init(serverUrl)`

Initialize client. Must be called before any other methods.

**Params:**

- `serverUrl : String`

--

#### `try(testId, versionIds, callback)`

Participate in specific test by receiving a designated version.

**Params:**

- `testId : String`
- `versionIds : String[]`
- `callback : Function` - called with designated `versionId : String`.

--

#### `win(testId)`

Register conversion in specific test.

**Params:**

- `testId : String`


Testing
-------

1. Install dependencies: `npm install`;
2. Run test suite: `npm test`.
