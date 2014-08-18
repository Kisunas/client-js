var expect = chai.expect;


describe('BayesianBandit', function () {

  var SERVER_URL = 'http://foo.local/',
      TEST_ID = 'test',
      noop = function () {},
      server;

  beforeEach(function () {
    server = sinon.fakeServer.create();

    BayesianBandit.reset();
  });

  afterEach(function () {
    server.restore();
  });

  it('should expose it\'s version', function () {
    expect(BayesianBandit.VERSION).to.be.a('string').and.contain('.');
  });

  describe('#init', function () {

    it('should throw if client was already initialized', function () {
      BayesianBandit.init(SERVER_URL);
      expect(function () {
        BayesianBandit.init(SERVER_URL);
      }).to.throw(Error);
    });

  });

  describe('#reset', function () {

    beforeEach(function () {
      BayesianBandit.init(SERVER_URL);

      server.respondWith('PUT', SERVER_URL + TEST_ID, JSON.stringify({ versions: ['a', 'b'], winning: 'b' }));
      BayesianBandit.try(TEST_ID, ['a', 'b'], noop);
      server.respond();
    });

    it('should allow to reinitialize client', function () {
      var spy = sinon.spy();

      BayesianBandit.reset();
      expect(function () {
        BayesianBandit.init('http://bar.local/');
      }).not.to.throw(Error);

      server.respondWith('PUT', 'http://bar.local/' + TEST_ID, JSON.stringify({ versions: ['a', 'b'], winning: 'b' }));
      BayesianBandit.try(TEST_ID, ['a', 'b'], spy);
      server.respond();

      expect(spy.calledWithExactly('b')).to.be.true;
    });

    it('should clear storage', function () {
      var spy = sinon.spy();

      BayesianBandit.reset();
      BayesianBandit.init('http://bar.local/');

      server.respondWith('PUT', 'http://bar.local/' + TEST_ID, JSON.stringify({ versions: ['a', 'b'], winning: 'a' }));
      BayesianBandit.try(TEST_ID, ['a', 'b'], spy);
      server.respond();

      expect(spy.calledWithExactly('a')).to.be.true;
    });

  });

  describe('#try', function () {

    beforeEach(function () {
      BayesianBandit.init(SERVER_URL);
    });

    it('should throw if #init wasn\'t called', function () {
      BayesianBandit.reset();

      expect(function () {
        BayesianBandit.try(TEST_ID, ['a', 'b'], noop);
      }).to.throw(Error);
    });

    it('should ask server to designate a version', function () {
      var spy = sinon.spy();

      server.respondWith('PUT', SERVER_URL + TEST_ID, JSON.stringify({ versions: ['a', 'b'], winning: 'b' }));
      BayesianBandit.try(TEST_ID, ['a', 'b'], spy);
      server.respond();

      expect(spy.calledWithExactly('b')).to.be.true;
    });

    it('should return random version if server fails to respond', function () {
      var spy = sinon.spy(),
          random = sinon.stub(Math, 'random');

      random.returns(0.42);

      BayesianBandit.try(TEST_ID, ['a', 'b'], spy);
      server.respond();

      expect(spy.calledWithExactly('a')).to.be.true;
    });

    it('should return previously designated version without asking server', function () {
      var spy = sinon.spy();

      server.respondWith('PUT', SERVER_URL + TEST_ID, JSON.stringify({ versions: ['a', 'b'], winning: 'b' }));
      BayesianBandit.try(TEST_ID, ['a', 'b'], noop);
      server.respond();

      BayesianBandit.try(TEST_ID, ['a', 'b'], spy);

      expect(spy.calledWithExactly('b')).to.be.true;
    });

    it('should ask server to designate version if the stored one is no longer relevant', function () {
      var spy = sinon.spy();

      server.respondWith('PUT', SERVER_URL + TEST_ID, JSON.stringify({ versions: ['a', 'b'], winning: 'b' }));
      BayesianBandit.try(TEST_ID, ['a', 'b'], noop);
      server.respond();

      server.respondWith('PUT', SERVER_URL + TEST_ID, JSON.stringify({ versions: ['a', 'c'], winning: 'a' }));
      BayesianBandit.try(TEST_ID, ['a', 'c'], spy);
      server.respond();

      expect(spy.calledWithExactly('a')).to.be.true;
    });

    it('should store previously designated version in local storage', function () {
      var storage = {};

      server.respondWith('PUT', SERVER_URL + TEST_ID, JSON.stringify({ versions: ['a', 'b'], winning: 'b' }));
      BayesianBandit.try(TEST_ID, ['a', 'b'], noop);
      server.respond();

      storage[TEST_ID] = {
        id: 'b',
        won: false
      };

      server.respondWith('PUT', SERVER_URL + 'test2', JSON.stringify({ versions: ['c', 'd', 'e'], winning: 'c' }));
      BayesianBandit.try('test2', ['c', 'd', 'e'], noop);
      server.respond();

      storage['test2'] = {
        id: 'c',
        won: false
      };

      expect(readStorage()).to.deep.equal(storage);
    });

  });

  describe('#win', function () {

    beforeEach(function () {
      BayesianBandit.init(SERVER_URL);

      server.respondWith('PUT', SERVER_URL + TEST_ID, JSON.stringify({ versions: ['a', 'b'], winning: 'b' }));
      BayesianBandit.try(TEST_ID, ['a', 'b'], noop);
      server.respond();
    });

    it('should throw if #init wasn\'t called', function () {
      BayesianBandit.reset();

      expect(function () {
        BayesianBandit.win(TEST_ID);
      }).to.throw(Error);
    });

    it('should report conversion to server', function () {
      server.respondWith('POST', SERVER_URL + TEST_ID + '/wins', '');
      BayesianBandit.win(TEST_ID);
      server.respond();

      expect(server.requests.length).to.equal(2);
    });

    it('should not report already reported conversion to server', function () {
      server.respondWith('POST', SERVER_URL + TEST_ID + '/wins', '');
      BayesianBandit.win(TEST_ID);
      server.respond();

      BayesianBandit.win(TEST_ID);

      expect(server.requests.length).to.equal(2);
    });

    it('should not report conversion in unknown test to server', function () {
      server.respondWith('POST', SERVER_URL + 'test2' + '/wins', '');
      BayesianBandit.win('test2');
      server.respond();

      expect(server.requests.length).to.equal(1);
    });

  });

  function readStorage() {
    return JSON.parse(window.localStorage.getItem('BayesianBandit:storage'));
  }

});
